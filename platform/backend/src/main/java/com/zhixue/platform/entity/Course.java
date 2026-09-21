package com.zhixue.platform.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;

@Entity
public class Course {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String subject;
    private String grade;
    private String status;
    private Integer scenes;
    private LocalDateTime updatedAt;
    @Lob
    private String content;

    public String getContent(){return content;}
    public void setContent(JsonNode value){
        if(value==null||value.isNull())return;
        if(!value.isObject()||!value.path("scenes").isArray()||value.path("scenes").isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"课堂内容必须包含场景数组");
        String serialized=value.toString();
        if(serialized.length()>2_000_000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"课堂内容过大");
        this.content=serialized;
        this.scenes=value.path("scenes").size();
        this.updatedAt=LocalDateTime.now();
    }
    protected Course() {}
    public Course(String title, String subject, String grade) { this.title=title; this.subject=subject; this.grade=grade; this.status="DRAFT"; this.scenes=4; this.updatedAt=LocalDateTime.now(); }
    public Long getId(){return id;} public String getTitle(){return title;} public String getSubject(){return subject;} public String getGrade(){return grade;} public String getStatus(){return status;} public Integer getScenes(){return scenes;} public LocalDateTime getUpdatedAt(){return updatedAt;}
    public void update(String title,String subject,String grade,String status){this.title=title;this.subject=subject;this.grade=grade;this.status=status;this.updatedAt=LocalDateTime.now();}
}
