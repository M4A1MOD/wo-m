package com.zhixue.platform.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

public record LessonChatRequest(
    @NotBlank String question,
    @NotBlank String topic,
    String subject,
    String grade,
    String sceneTitle,
    List<String> knowledgePoints,
    List<Map<String, String>> history,
    String provider
) {}
