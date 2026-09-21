package com.zhixue.platform.dto;

import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.databind.JsonNode;

public record CourseRequest(@NotBlank String title, String subject, String grade, String status, JsonNode content) {}
