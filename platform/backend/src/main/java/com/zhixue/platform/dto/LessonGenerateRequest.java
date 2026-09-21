package com.zhixue.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import java.util.List;

public record LessonGenerateRequest(
    @NotBlank @Size(max = 100) String topic,
    @Size(max = 4000) String description,
    @Size(max = 50) String subject,
    @Size(max = 50) String grade,
    @Min(20) @Max(120) Integer duration,
    @Size(max = 50) String provider,
    @JsonAlias("content_style") @Size(max = 50) String contentStyle,
    @Size(max = 5) List<@Valid ReferenceMaterial> materials
) {
    public record ReferenceMaterial(@NotBlank @Size(max = 200) String filename,
                                    @NotBlank @Size(max = 8000) String text) {}
}
