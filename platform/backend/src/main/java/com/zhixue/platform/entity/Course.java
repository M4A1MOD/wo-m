package com.zhixue.platform.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
    protected Course() {}
    public Course(String title, String subject, String grade) { this.title=title; this.subject=subject; this.grade=grade; this.status="DRAFT"; this.scenes=4; this.updatedAt=LocalDateTime.now(); }
    public Long getId(){return id;} public String getTitle(){return title;} public String getSubject(){return subject;} public String getGrade(){return grade;} public String getStatus(){return status;} public Integer getScenes(){return scenes;} public LocalDateTime getUpdatedAt(){return updatedAt;}
    public void update(String title,String subject,String grade,String status){this.title=title;this.subject=subject;this.grade=grade;this.status=status;this.updatedAt=LocalDateTime.now();}
}
