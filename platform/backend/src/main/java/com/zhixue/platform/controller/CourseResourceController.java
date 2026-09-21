package com.zhixue.platform.controller;

import com.zhixue.platform.common.ApiResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/v1/resources")
public class CourseResourceController {
    private static final long MAX_BYTES = 20L * 1024 * 1024;
    private static final Pattern RESOURCE_ID = Pattern.compile("[0-9a-fA-F-]{36}");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        "txt", "md", "pdf", "pptx", "docx", "xlsx", "csv", "zip",
        "png", "jpg", "jpeg", "gif", "webp", "svg", "mp4", "mov"
    );
    private static final Set<String> INLINE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "svg");
    private final Path storageDirectory;

    public CourseResourceController(@Value("${app.resource-storage-dir:../.runtime/uploads}") String storageDirectory) {
        this.storageDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
    }

    @PostMapping
    public ApiResponse<Object> upload(@RequestBody Map<String, String> payload) throws IOException {
        String filename = sanitizeFilename(payload.get("filename"));
        String extension = extension(filename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(BAD_REQUEST, "不支持该文件类型");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(payload.getOrDefault("content_base64", ""));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(BAD_REQUEST, "文件内容无效");
        }
        if (bytes.length == 0 || bytes.length > MAX_BYTES) {
            throw new ResponseStatusException(BAD_REQUEST, "文件必须在 1 字节到 20 MB 之间");
        }
        Files.createDirectories(storageDirectory);
        String id = UUID.randomUUID().toString();
        Files.write(storageDirectory.resolve(id + "__" + filename), bytes,
            StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        return ApiResponse.ok(Map.of(
            "id", id,
            "filename", filename,
            "downloadUrl", "/api/v1/resources/" + id + "/download"
        ));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable String id) throws IOException {
        Path file = find(id);
        String filename = file.getFileName().toString().substring(38);
        MediaType mediaType = MediaTypeFactory.getMediaType(filename).orElse(MediaType.APPLICATION_OCTET_STREAM);
        ContentDisposition disposition = (INLINE_EXTENSIONS.contains(extension(filename))
            ? ContentDisposition.inline() : ContentDisposition.attachment())
            .filename(filename, java.nio.charset.StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
            .contentType(mediaType)
            .contentLength(Files.size(file))
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
            .body(new PathResource(file));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Object> delete(@PathVariable String id) throws IOException {
        Files.deleteIfExists(find(id));
        return ApiResponse.ok(Map.of("deleted", true));
    }

    private Path find(String id) throws IOException {
        if (!RESOURCE_ID.matcher(id).matches() || !Files.isDirectory(storageDirectory)) {
            throw new ResponseStatusException(NOT_FOUND, "文件不存在");
        }
        try (var files = Files.list(storageDirectory)) {
            return files.filter(path -> path.getFileName().toString().startsWith(id + "__"))
                .findFirst().orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "文件不存在"));
        }
    }

    private static String sanitizeFilename(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "文件名不能为空");
        }
        String filename = Path.of(value).getFileName().toString().replaceAll("[\\\\/:*?\"<>|]", "_");
        if (filename.length() > 180) filename = filename.substring(filename.length() - 180);
        return filename;
    }

    private static String extension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase();
    }
}
