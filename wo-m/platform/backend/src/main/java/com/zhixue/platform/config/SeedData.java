package com.zhixue.platform.config;

import com.zhixue.platform.entity.Course;
import com.zhixue.platform.repository.CourseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SeedData {
    @Bean CommandLineRunner seed(CourseRepository repository) {
        return args -> { if (repository.count() == 0) { Course c=new Course("牛顿第二定律","物理","高一"); c.update(c.getTitle(),c.getSubject(),c.getGrade(),"PUBLISHED"); repository.save(c); } };
    }
}
