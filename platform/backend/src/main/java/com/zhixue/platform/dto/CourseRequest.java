package com.zhixue.platform.dto;

import jakarta.validation.constraints.NotBlank;

public record CourseRequest(@NotBlank String title, String subject, String grade, String status) {}
