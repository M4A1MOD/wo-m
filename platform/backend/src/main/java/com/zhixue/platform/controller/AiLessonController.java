package com.zhixue.platform.controller;

import com.zhixue.platform.common.ApiResponse;
import com.zhixue.platform.dto.LessonChatRequest;
import com.zhixue.platform.dto.LessonGenerateRequest;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/v1/ai")
public class AiLessonController {
    private final RestClient restClient;

    public AiLessonController(@Value("${app.ai-service-url}") String aiServiceUrl) {
        this.restClient = RestClient.builder().baseUrl(aiServiceUrl).build();
    }

    @PostMapping("/lessons/generate")
    public ApiResponse<Object> generate(@Valid @RequestBody LessonGenerateRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("topic", request.topic());
        payload.put("subject", request.subject());
        payload.put("grade", request.grade());
        payload.put("duration", request.duration() == null ? 45 : request.duration());
        payload.put("provider", request.provider());
        payload.put("content_style", request.contentStyle());
        return ApiResponse.ok(post("/api/v1/lessons/generate", payload));
    }

    @PostMapping("/lessons/chat")
    public ApiResponse<Object> chat(@Valid @RequestBody LessonChatRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("question", request.question());
        payload.put("topic", request.topic());
        payload.put("subject", request.subject());
        payload.put("grade", request.grade());
        payload.put("scene_title", request.sceneTitle());
        payload.put("knowledge_points", request.knowledgePoints() == null ? java.util.List.of() : request.knowledgePoints());
        payload.put("history", request.history() == null ? java.util.List.of() : request.history());
        payload.put("provider", request.provider());
        return ApiResponse.ok(post("/api/v1/lessons/chat", payload));
    }

    @GetMapping("/providers")
    public ApiResponse<Object> providers() {
        return ApiResponse.ok(restClient.get().uri("/api/v1/providers").retrieve().body(Object.class));
    }

    @PostMapping("/materials/parse")
    public ApiResponse<Object> parseMaterial(@RequestBody Map<String, Object> payload) { return ApiResponse.ok(post("/api/v1/materials/parse", payload)); }

    @PostMapping("/knowledge-graphs/generate")
    public ApiResponse<Object> knowledgeGraph(@RequestBody Map<String, Object> payload) { return ApiResponse.ok(post("/api/v1/knowledge-graphs/generate", payload)); }

    @PostMapping("/content/multimodal")
    public ApiResponse<Object> multimodal(@RequestBody Map<String, Object> payload) { return ApiResponse.ok(post("/api/v1/content/multimodal", payload)); }

    @PostMapping("/speech/tts")
    public ApiResponse<Object> tts(@RequestBody Map<String, Object> payload) { return ApiResponse.ok(post("/api/v1/speech/tts", payload)); }

    @PostMapping("/speech/asr")
    public ApiResponse<Object> asr(@RequestBody Map<String, Object> payload) { return ApiResponse.ok(post("/api/v1/speech/asr", payload)); }

    @PostMapping("/reports/generate")
    public ApiResponse<Object> report(@RequestBody Map<String, Object> payload) { return ApiResponse.ok(post("/api/v1/reports/generate", payload)); }

    private Object post(String path, Object payload) {
        return restClient.post()
            .uri(path)
            .contentType(MediaType.APPLICATION_JSON)
            .body(payload)
            .retrieve()
            .body(Object.class);
    }
}
