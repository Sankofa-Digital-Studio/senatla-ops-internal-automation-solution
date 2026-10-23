import AVFoundation
import Capacitor
import CryptoKit
import Foundation
import UIKit
import Vision
import VisionKit

@objc(SenatlaDocumentScannerPlugin)
public final class SenatlaDocumentScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SenatlaDocumentScannerPlugin"
    public let jsName = "SenatlaDocumentScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "release", returnType: CAPPluginReturnPromise)
    ]

    private static let cacheName = "SenatlaDocumentScanner"
    private static let pageLimit = 5
    private static let byteLimit = 15 * 1024 * 1024
    private static let languageLimit = 8
    private static let textLimit = 100_000
    private static let blockLimit = 5_000
    private static let dimensionLimit: CGFloat = 4_096

    private let worker = DispatchQueue(
        label: "za.co.senatlatrading.ops.document-scanner",
        qos: .userInitiated
    )
    private var active: ScanRequest?

    public override func load() {
        super.load()
        worker.async {
            try? self.removeAllSessions()
        }
    }
    private struct ScanRequest {
        let call: CAPPluginCall
        let sessionId: UUID
        let sessionValue: String
        let maxPages: Int
        let languages: [String]
    }

    private struct Artifact {
        let id: UUID
        let url: URL
        let width: Int
        let height: Int
        let byteSize: Int
        let sha256: String
        let text: String
        let blocks: [JSObject]

        var bridgeValue: JSObject {
            let textBlocks: JSArray = blocks.map { $0 as JSValue }
            return [
                "artifactId": id.uuidString.lowercased(),
                "uri": url.absoluteString,
                "mimeType": "image/jpeg",
                "byteSize": byteSize,
                "width": width,
                "height": height,
                "sha256": sha256,
                "text": text,
                "textBlocks": textBlocks
            ]
        }
    }

    private enum Failure: Error {
        case cache
        case unsafePath
        case invalidImage
        case artifactTooLarge
        case recognition(Error)
    }

    @objc public func isAvailable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let scannerSupported = VNDocumentCameraViewController.isSupported
            let cameraAvailable = UIImagePickerController.isSourceTypeAvailable(.camera)
            let authorization = AVCaptureDevice.authorizationStatus(for: .video)
            let permissionAvailable = authorization != .denied && authorization != .restricted
            let available = scannerSupported && cameraAvailable && permissionAvailable
            var result: JSObject = ["available": available]
            if !scannerSupported {
                result["reason"] = "unsupported_platform"
            } else if !cameraAvailable || !permissionAvailable {
                result["reason"] = "camera_unavailable"
            }
            call.resolve(result)
        }
    }

    @objc public func scan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.active == nil else {
                call.reject("A document scan is already active.", "NATIVE_FAILURE")
                return
            }
            guard VNDocumentCameraViewController.isSupported,
                  UIImagePickerController.isSourceTypeAvailable(.camera) else {
                call.reject("Native document scanning is unavailable on this device.", "UNSUPPORTED_PLATFORM")
                return
            }
            guard let sessionValue = call.getString("sessionId"),
                  let sessionId = Self.uuid(sessionValue) else {
                call.reject("sessionId must be a UUID.", "INVALID_OPTIONS")
                return
            }
            let maxPages = call.getInt("maxPages") ?? Self.pageLimit
            guard (1...Self.pageLimit).contains(maxPages),
                  let galleryImportAllowed = call.getBool("galleryImportAllowed"),
                  !galleryImportAllowed else {
                call.reject("The document scan options are invalid.", "INVALID_OPTIONS")
                return
            }
            let languages = call.getArray("recognitionLanguages", String.self) ?? []
            guard Self.valid(languages: languages) else {
                call.reject("recognitionLanguages contains an invalid language tag.", "INVALID_OPTIONS")
                return
            }

            let request = ScanRequest(
                call: call,
                sessionId: sessionId,
                sessionValue: sessionValue,
                maxPages: maxPages,
                languages: languages
            )
            self.active = request
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized:
                self.presentScanner(for: request)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        guard self.active?.sessionId == request.sessionId else { return }
                        if granted {
                            self.presentScanner(for: request)
                        } else {
                            self.active = nil
                            call.reject("Camera permission is required.", "PERMISSION_DENIED")
                        }
                    }
                }
            case .denied, .restricted:
                self.active = nil
                call.reject("Camera permission is required.", "PERMISSION_DENIED")
            @unknown default:
                self.active = nil
                call.reject("Camera permission could not be determined.", "NATIVE_FAILURE")
            }
        }
    }

    @objc public func release(_ call: CAPPluginCall) {
        guard let sessionValue = call.getString("sessionId"),
              let sessionId = Self.uuid(sessionValue) else {
            call.reject("sessionId must be a UUID.", "INVALID_OPTIONS")
            return
        }
        let rawIds = call.getArray("artifactIds", String.self)
        let artifactIds: [UUID]?
        if let rawIds {
            guard !rawIds.isEmpty,
                  rawIds.count <= Self.pageLimit,
                  rawIds.allSatisfy({ Self.uuid($0) != nil }) else {
                call.reject("artifactIds must contain between 1 and 5 UUIDs.", "INVALID_OPTIONS")
                return
            }
            artifactIds = rawIds.compactMap(Self.uuid)
        } else {
            artifactIds = nil
        }

        DispatchQueue.main.async {
            guard self.active?.sessionId != sessionId else {
                call.reject("Artifacts cannot be released during their scan.", "NATIVE_FAILURE")
                return
            }
            self.worker.async {
                do {
                    let released = try self.remove(sessionId: sessionId, artifactIds: artifactIds)
                    DispatchQueue.main.async {
                        let response: JSObject = ["released": released]
                        call.resolve(response)
                    }
                } catch {
                    DispatchQueue.main.async {
                        call.reject("Temporary scan files could not be removed securely.", "CLEANUP_FAILED")
                    }
                }
            }
        }
    }

    private static func uuid(_ value: String) -> UUID? {
        guard value.range(
            of: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
            options: .regularExpression
        ) != nil else { return nil }
        return UUID(uuidString: value)
    }

    private static func valid(languages: [String]) -> Bool {
        guard languages.count <= languageLimit,
              Set(languages.map { $0.lowercased() }).count == languages.count else { return false }
        return languages.allSatisfy {
            $0.range(
                of: "^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$",
                options: .regularExpression
            ) != nil
        }
    }

    private func presentScanner(for request: ScanRequest) {
        guard active?.sessionId == request.sessionId,
              let presenter = bridge?.viewController,
              presenter.presentedViewController == nil else {
            active = nil
            request.call.reject("The native scanner could not be presented.", "NATIVE_FAILURE")
            return
        }
        let controller = VNDocumentCameraViewController()
        controller.delegate = self
        controller.modalPresentationStyle = .fullScreen
        presenter.present(controller, animated: true)
    }

    private func finish(_ request: ScanRequest, scan: VNDocumentCameraScan) {
        guard scan.pageCount > 0,
              scan.pageCount <= request.maxPages,
              scan.pageCount <= Self.pageLimit else {
            dismiss {
                self.active = nil
                request.call.reject("The scan returned an invalid page count.", "NATIVE_FAILURE")
            }
            return
        }
        let images = (0..<scan.pageCount).map(scan.imageOfPage(at:))
        dismiss {
            self.worker.async {
                do {
                    let artifacts = try self.process(images: images, request: request)
                    let pages: JSArray = artifacts.map { $0.bridgeValue as JSValue }
                    DispatchQueue.main.async {
                        guard self.active?.sessionId == request.sessionId else {
                            try? self.remove(sessionId: request.sessionId, artifactIds: nil)
                            return
                        }
                        self.active = nil
                        let result: JSObject = [
                            "sessionId": request.sessionValue,
                            "pages": pages
                        ]
                        request.call.resolve(result)
                    }
                } catch {
                    DispatchQueue.main.async {
                        self.active = nil
                        request.call.reject("Document processing failed.", self.code(for: error))
                    }
                }
            }
        }
    }
    private func process(images: [UIImage], request: ScanRequest) throws -> [Artifact] {
        let directory = try makeSessionDirectory(request.sessionId)
        do {
            return try images.map { image in
                try autoreleasepool {
                    guard let normalized = normalize(image),
                          let cgImage = normalized.cgImage,
                          cgImage.width >= 32,
                          cgImage.height >= 32,
                          let data = normalized.jpegData(compressionQuality: 0.90) else {
                        throw Failure.invalidImage
                    }
                    guard data.count <= Self.byteLimit else {
                        throw Failure.artifactTooLarge
                    }

                    let id = UUID()
                    let url = try artifactURL(in: directory, id: id)
                    try data.write(to: url, options: .atomic)
                    try FileManager.default.setAttributes(
                        [.protectionKey: FileProtectionType.complete],
                        ofItemAtPath: url.path
                    )
                    try excludeFromBackup(url)

                    let recognized = try recognize(cgImage, languages: request.languages)
                    let digest = SHA256.hash(data: data).map {
                        String(format: "%02x", $0)
                    }.joined()
                    return Artifact(
                        id: id,
                        url: url,
                        width: cgImage.width,
                        height: cgImage.height,
                        byteSize: data.count,
                        sha256: digest,
                        text: recognized.text,
                        blocks: recognized.blocks
                    )
                }
            }
        } catch {
            try? remove(sessionId: request.sessionId, artifactIds: nil)
            throw error
        }
    }
    private func normalize(_ image: UIImage) -> UIImage? {
        let width = image.cgImage.map { CGFloat($0.width) } ?? image.size.width * image.scale
        let height = image.cgImage.map { CGFloat($0.height) } ?? image.size.height * image.scale
        guard width > 0, height > 0 else { return nil }
        let ratio = min(1, Self.dimensionLimit / max(width, height))
        let size = CGSize(
            width: max(1, (width * ratio).rounded()),
            height: max(1, (height * ratio).rounded())
        )
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: size))
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }

    private func recognize(
        _ image: CGImage,
        languages: [String]
    ) throws -> (text: String, blocks: [JSObject]) {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        if languages.isEmpty {
            request.automaticallyDetectsLanguage = true
        } else if let supported = try? request.supportedRecognitionLanguages() {
            let supportedTags = Set(supported.map { $0.lowercased() })
            let usableLanguages = languages.filter {
                supportedTags.contains($0.lowercased())
            }
            if usableLanguages.isEmpty {
                request.automaticallyDetectsLanguage = true
            } else {
                request.recognitionLanguages = usableLanguages
            }
        } else {
            request.automaticallyDetectsLanguage = true
        }
        do {
            try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
        } catch {
            throw Failure.recognition(error)
        }

        let observations = (request.results ?? []).sorted {
            let difference = $0.boundingBox.midY - $1.boundingBox.midY
            return abs(difference) > 0.01
                ? difference > 0
                : $0.boundingBox.minX < $1.boundingBox.minX
        }
        var lines: [String] = []
        var blocks: [JSObject] = []
        for observation in observations.prefix(Self.blockLimit) {
            guard let candidate = observation.topCandidates(1).first else { continue }
            let blockText = String(candidate.string.prefix(Self.textLimit))
            lines.append(blockText)
            let box = observation.boundingBox
            let bounds: JSObject = [
                "x": Double(box.minX),
                "y": Double(box.minY),
                "width": Double(box.width),
                "height": Double(box.height)
            ]
            blocks.append([
                "text": blockText,
                "confidence": Double(candidate.confidence),
                "bounds": bounds
            ])
        }
        return (
            String(lines.joined(separator: "\n").prefix(Self.textLimit)),
            blocks
        )
    }

    private func cacheRoot(create: Bool) throws -> URL {
        guard let caches = FileManager.default.urls(
            for: .cachesDirectory,
            in: .userDomainMask
        ).first else { throw Failure.cache }
        let root = caches.appendingPathComponent(Self.cacheName, isDirectory: true)
        let manager = FileManager.default
        if manager.fileExists(atPath: root.path) {
            let values = try root.resourceValues(forKeys: [
                .isDirectoryKey,
                .isSymbolicLinkKey
            ])
            guard values.isDirectory == true,
                  values.isSymbolicLink != true else { throw Failure.unsafePath }
        } else if create {
            try manager.createDirectory(
                at: root,
                withIntermediateDirectories: false,
                attributes: [.protectionKey: FileProtectionType.complete]
            )
            try excludeFromBackup(root)
        }
        return root.standardizedFileURL.resolvingSymlinksInPath()
    }

    private func makeSessionDirectory(_ id: UUID) throws -> URL {
        let root = try cacheRoot(create: true)
        let directory = root.appendingPathComponent(
            id.uuidString.lowercased(),
            isDirectory: true
        )
        guard descendant(directory, of: root) else { throw Failure.unsafePath }
        let manager = FileManager.default
        guard !manager.fileExists(atPath: directory.path) else {
            throw Failure.unsafePath
        }
        do {
            try manager.createDirectory(
                at: directory,
                withIntermediateDirectories: false,
                attributes: [.protectionKey: FileProtectionType.complete]
            )
            try excludeFromBackup(directory)
            return directory
        } catch {
            try? manager.removeItem(at: directory)
            throw error
        }
    }

    private func excludeFromBackup(_ url: URL) throws {
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var mutableURL = url
        try mutableURL.setResourceValues(values)
    }

    private func artifactURL(in directory: URL, id: UUID) throws -> URL {
        let url = directory.appendingPathComponent(
            "\(id.uuidString.lowercased()).jpg",
            isDirectory: false
        )
        guard descendant(url, of: directory) else { throw Failure.unsafePath }
        return url
    }

    @discardableResult
    private func removeAllSessions() throws -> Int {
        let manager = FileManager.default
        let root = try cacheRoot(create: false)
        guard manager.fileExists(atPath: root.path) else { return 0 }
        let entries = try manager.contentsOfDirectory(
            at: root,
            includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey],
            options: []
        )
        var removed = 0
        for entry in entries {
            let values = try entry.resourceValues(forKeys: [
                .isDirectoryKey,
                .isSymbolicLinkKey
            ])
            guard values.isDirectory == true,
                  values.isSymbolicLink != true,
                  let sessionId = Self.uuid(entry.lastPathComponent) else {
                throw Failure.unsafePath
            }
            removed += try remove(sessionId: sessionId, artifactIds: nil)
        }
        if manager.fileExists(atPath: root.path) {
            try manager.removeItem(at: root)
        }
        return removed
    }
    @discardableResult
    private func remove(sessionId: UUID, artifactIds: [UUID]?) throws -> Int {
        let manager = FileManager.default
        let root = try cacheRoot(create: false)
        guard manager.fileExists(atPath: root.path) else { return 0 }
        let directory = root.appendingPathComponent(
            sessionId.uuidString.lowercased(),
            isDirectory: true
        )
        guard descendant(directory, of: root),
              manager.fileExists(atPath: directory.path) else { return 0 }
        let directoryValues = try directory.resourceValues(forKeys: [
            .isDirectoryKey,
            .isSymbolicLinkKey
        ])
        guard directoryValues.isDirectory == true,
              directoryValues.isSymbolicLink != true else { throw Failure.unsafePath }

        guard let artifactIds else {
            let entries = try manager.contentsOfDirectory(
                at: directory,
                includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey],
                options: []
            )
            for entry in entries {
                guard descendant(entry, of: directory),
                      entry.pathExtension.lowercased() == "jpg" else {
                    throw Failure.unsafePath
                }
                let values = try entry.resourceValues(forKeys: [
                    .isRegularFileKey,
                    .isSymbolicLinkKey
                ])
                guard values.isRegularFile == true,
                      values.isSymbolicLink != true else { throw Failure.unsafePath }
            }
            try manager.removeItem(at: directory)
            return entries.count
        }

        var validatedURLs: [URL] = []
        for id in artifactIds {
            let url = try artifactURL(in: directory, id: id)
            guard manager.fileExists(atPath: url.path) else { continue }
            let values = try url.resourceValues(forKeys: [
                .isRegularFileKey,
                .isSymbolicLinkKey
            ])
            guard values.isRegularFile == true,
                  values.isSymbolicLink != true else { throw Failure.unsafePath }
            validatedURLs.append(url)
        }
        for url in validatedURLs {
            try manager.removeItem(at: url)
        }
        if try manager.contentsOfDirectory(atPath: directory.path).isEmpty {
            try manager.removeItem(at: directory)
        }
        return validatedURLs.count
    }

    private func descendant(_ candidate: URL, of parent: URL) -> Bool {
        let parentPath = parent.standardizedFileURL.resolvingSymlinksInPath().path
        let candidatePath = candidate.standardizedFileURL.resolvingSymlinksInPath().path
        return candidatePath.hasPrefix(parentPath + "/")
    }

    private func dismiss(completion: @escaping () -> Void) {
        guard let presenter = bridge?.viewController,
              presenter.presentedViewController != nil else {
            completion()
            return
        }
        presenter.dismiss(animated: true, completion: completion)
    }

    private func code(for error: Error) -> String {
        switch error {
        case Failure.artifactTooLarge:
            return "ARTIFACT_TOO_LARGE"
        default:
            return "NATIVE_FAILURE"
        }
    }
}

extension SenatlaDocumentScannerPlugin: VNDocumentCameraViewControllerDelegate {
    public func documentCameraViewController(
        _ controller: VNDocumentCameraViewController,
        didFinishWith scan: VNDocumentCameraScan
    ) {
        guard let request = active else {
            controller.dismiss(animated: true)
            return
        }
        finish(request, scan: scan)
    }

    public func documentCameraViewControllerDidCancel(
        _ controller: VNDocumentCameraViewController
    ) {
        guard let request = active else {
            controller.dismiss(animated: true)
            return
        }
        dismiss {
            self.active = nil
            request.call.reject("Document scanning was cancelled.", "USER_CANCELLED")
        }
    }

    public func documentCameraViewController(
        _ controller: VNDocumentCameraViewController,
        didFailWithError error: Error
    ) {
        guard let request = active else {
            controller.dismiss(animated: true)
            return
        }
        dismiss {
            self.active = nil
            request.call.reject("The native document scanner failed.", "NATIVE_FAILURE")
        }
    }
}
