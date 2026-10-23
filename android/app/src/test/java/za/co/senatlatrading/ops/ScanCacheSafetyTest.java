package za.co.senatlatrading.ops;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.UUID;
import org.junit.Test;

public class ScanCacheSafetyTest {
    @Test
    public void acceptsCanonicalUuid() {
        String id = UUID.randomUUID().toString();
        assertEquals(id, ScanCacheSafety.requireCanonicalUuid(id, "sessionId"));
    }

    @Test
    public void serializesSha256AsLowercase64Characters() {
        byte[] digest = new byte[32];
        digest[0] = 0x0f;
        digest[1] = (byte) 0xa5;
        String value = ScanCacheSafety.lowerHex(digest);
        assertEquals(64, value.length());
        assertEquals("0fa5" + "00".repeat(30), value);
        assertTrue(value.matches("^[a-f0-9]{64}$"));
    }

    @Test
    public void rejectsTraversalAndNonCanonicalUuid() {
        assertThrows(
            IllegalArgumentException.class,
            () -> ScanCacheSafety.requireCanonicalUuid("../outside", "sessionId")
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> ScanCacheSafety.requireCanonicalUuid(UUID.randomUUID().toString().toUpperCase(), "sessionId")
        );
    }

    @Test
    public void createsOnlyContainedPaths() throws IOException {
        File cache = Files.createTempDirectory("scan-cache-test").toFile();
        String sessionId = UUID.randomUUID().toString();
        String artifactId = UUID.randomUUID().toString();
        File session = ScanCacheSafety.requireSessionDirectory(cache, sessionId);
        File artifact = ScanCacheSafety.requireArtifactFile(session, artifactId);
        assertTrue(session.getCanonicalPath().startsWith(cache.getCanonicalPath() + File.separator));
        assertTrue(artifact.getCanonicalPath().startsWith(session.getCanonicalPath() + File.separator));
        assertEquals(artifactId + ".jpg", artifact.getName());
    }

    @Test
    public void deletesOnlySelectedArtifact() throws IOException {
        File cache = Files.createTempDirectory("scan-cache-test").toFile();
        String sessionId = UUID.randomUUID().toString();
        String firstId = UUID.randomUUID().toString();
        String secondId = UUID.randomUUID().toString();
        File session = ScanCacheSafety.requireSessionDirectory(cache, sessionId);
        assertTrue(session.mkdirs());
        File first = ScanCacheSafety.requireArtifactFile(session, firstId);
        File second = ScanCacheSafety.requireArtifactFile(session, secondId);
        assertTrue(first.createNewFile());
        assertTrue(second.createNewFile());
        assertTrue(ScanCacheSafety.deleteArtifact(cache, sessionId, firstId));
        assertFalse(first.exists());
        assertTrue(second.exists());
    }

    @Test
    public void sessionReleaseIsIdempotentAndContained() throws IOException {
        File cache = Files.createTempDirectory("scan-cache-test").toFile();
        String sessionId = UUID.randomUUID().toString();
        File session = ScanCacheSafety.requireSessionDirectory(cache, sessionId);
        assertTrue(session.mkdirs());
        File artifact = ScanCacheSafety.requireArtifactFile(session, UUID.randomUUID().toString());
        assertTrue(artifact.createNewFile());
        File unrelated = new File(cache, "must-remain.txt");
        assertTrue(unrelated.createNewFile());
        assertEquals(1, ScanCacheSafety.deleteSession(cache, sessionId));
        assertFalse(session.exists());
        assertTrue(unrelated.exists());
        assertEquals(0, ScanCacheSafety.deleteSession(cache, sessionId));
    }
    @Test
    public void startupSweepDeletesOnlyValidatedScanSessions() throws IOException {
        File cache = Files.createTempDirectory("scan-cache-test").toFile();
        String firstSessionId = UUID.randomUUID().toString();
        String secondSessionId = UUID.randomUUID().toString();
        File firstSession = ScanCacheSafety.requireSessionDirectory(cache, firstSessionId);
        File secondSession = ScanCacheSafety.requireSessionDirectory(cache, secondSessionId);
        assertTrue(firstSession.mkdirs());
        assertTrue(secondSession.mkdirs());
        assertTrue(ScanCacheSafety.requireArtifactFile(firstSession, UUID.randomUUID().toString()).createNewFile());
        assertTrue(ScanCacheSafety.requireArtifactFile(secondSession, UUID.randomUUID().toString()).createNewFile());

        assertEquals(2, ScanCacheSafety.deleteAllSessions(cache));
        assertFalse(new File(cache, ScanCacheSafety.CACHE_DIRECTORY_NAME).exists());
        assertEquals(0, ScanCacheSafety.deleteAllSessions(cache));
    }
}
