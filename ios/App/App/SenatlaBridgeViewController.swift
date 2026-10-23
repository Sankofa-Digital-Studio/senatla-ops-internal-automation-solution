import Capacitor

@objc(SenatlaBridgeViewController)
final class SenatlaBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(SenatlaDocumentScannerPlugin())
    }
}