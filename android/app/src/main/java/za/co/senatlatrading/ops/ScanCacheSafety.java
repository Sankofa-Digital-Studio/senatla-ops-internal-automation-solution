package za.co.senatlatrading.ops;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

final class ScanCacheSafety {
    static final String CACHE_DIRECTORY_NAME = "senatla-document-scans";

    private ScanCacheSafety() {}

    static String requireCanonicalUuid(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
        try {
            UUID parsed = UUID.fromString(value);
            String canonical = parsed.toString();
            if (!canonical.equals(value)) {
                throw new IllegalArgumentException(fieldName + " must be a canonical UUID.");
            }
            return canonical;
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(fieldName + " must be a canonical UUID.");
        }
    }

    static String lowerHex(byte[] bytes) {
        char[] characters = new char[bytes.length * 2];
        final char[] alphabet = "0123456789abcdef".toCharArray();
        for (int index = 0; index < bytes.length; index++) {
            int value = bytes[index] & 0xff;
            characters[index * 2] = alphabet[value >>> 4];
            characters[index * 2 + 1] = alphabet[value & 0x0f];
        }
        return new String(characters);
    }

    static File requireSessionDirectory(File cacheDirectory, String sessionId) throws IOException {
        File canonicalCache = cacheDirectory.getCanonicalFile();
        File root = new File(canonicalCache, CACHE_DIRECTORY_NAME).getCanonicalFile();
        requireDescendant(canonicalCache, root, false);
        File session = new File(root, requireCanonicalUuid(sessionId, "sessionId")).getCanonicalFile();
        requireDescendant(root, session, false);
        return session;
    }

    static File requireArtifactFile(File sessionDirectory, String artifactId) throws IOException {
        File artifact = new File(sessionDirectory, requireCanonicalUuid(artifactId, "artifactId") + ".jpg").getCanonicalFile();
        requireDescendant(sessionDirectory.getCanonicalFile(), artifact, false);
        return artifact;
    }

    static int deleteSession(File cacheDirectory, String sessionId) throws IOException {
        File session = requireSessionDirectory(cacheDirectory, sessionId);
        if (!session.exists()) {
            return 0;
        }
        return deleteContainedTree(session, session);
    }

    static boolean deleteArtifact(File cacheDirectory, String sessionId, String artifactId) throws IOException {
        File session = requireSessionDirectory(cacheDirectory, sessionId);
        File artifact = requireArtifactFile(session, artifactId);
        if (!artifact.exists()) {
            return false;
        }
        requireDescendant(session, artifact.getCanonicalFile(), false);
        if (artifact.isDirectory()) {
            throw new IOException("Artifact path is not a file.");
        }
        if (!artifact.delete()) {
            throw new IOException("Could not delete scan artifact.");
        }
        return true;
    }

    static int deleteAllSessions(File cacheDirectory) throws IOException {
        File canonicalCache = cacheDirectory.getCanonicalFile();
        File root = new File(canonicalCache, CACHE_DIRECTORY_NAME);
        if (!root.exists()) {
            return 0;
        }
        if (isSymbolicLink(root) || !root.isDirectory()) {
            throw new SecurityException("Scan cache root is not a safe directory.");
        }
        File canonicalRoot = root.getCanonicalFile();
        requireDescendant(canonicalCache, canonicalRoot, false);
        File[] sessions = canonicalRoot.listFiles();
        if (sessions == null) {
            throw new IOException("Could not inspect scan cache root.");
        }
        int deletedFiles = 0;
        for (File session : sessions) {
            if (isSymbolicLink(session) || !session.isDirectory()) {
                throw new SecurityException("Scan cache contains an unsafe entry.");
            }
            String sessionId = requireCanonicalUuid(session.getName(), "sessionId");
            deletedFiles += deleteSession(cacheDirectory, sessionId);
        }
        if (canonicalRoot.exists() && !canonicalRoot.delete()) {
            throw new IOException("Could not remove the empty scan cache root.");
        }
        return deletedFiles;
    }

    private static boolean isSymbolicLink(File file) throws IOException {
        return !file.getAbsoluteFile().equals(file.getCanonicalFile());
    }

    private static int deleteContainedTree(File root, File candidate) throws IOException {
        File canonicalRoot = root.getCanonicalFile();
        if (isSymbolicLink(candidate)) {
            throw new SecurityException("Scan cache contains a symbolic link.");
        }
        File canonicalCandidate = candidate.getCanonicalFile();
        requireDescendant(canonicalRoot, canonicalCandidate, true);
        int deletedFiles = 0;
        if (canonicalCandidate.isDirectory()) {
            File[] children = canonicalCandidate.listFiles();
            if (children == null) {
                throw new IOException("Could not inspect scan cache directory.");
            }
            for (File child : children) {
                deletedFiles += deleteContainedTree(canonicalRoot, child);
            }
        } else {
            deletedFiles = 1;
        }
        if (!canonicalCandidate.delete()) {
            throw new IOException("Could not delete scan cache entry.");
        }
        return deletedFiles;
    }

    private static void requireDescendant(File root, File candidate, boolean allowRoot) throws IOException {
        String rootPath = root.getCanonicalPath();
        String candidatePath = candidate.getCanonicalPath();
        if ((allowRoot && rootPath.equals(candidatePath)) || candidatePath.startsWith(rootPath + File.separator)) {
            return;
        }
        throw new SecurityException("Scan cache path escaped its dedicated root.");
    }
}
