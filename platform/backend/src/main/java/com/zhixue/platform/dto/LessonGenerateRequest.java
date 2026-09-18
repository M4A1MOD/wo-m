package com.zhixue.platform.dto;

import jakarta.validation.constraints.NotBlank;

public record LessonGenerateRequest(
    @NotBlank String topic,
    String subject,
    String grade,
    Integer duration,
    String provider,
    String contentStyle
) {}
