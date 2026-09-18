package com.zhixue.platform.config;

import com.zhixue.platform.entity.Course;
import com.zhixue.platform.repository.CourseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SeedData {
    @Bean CommandLineRunner seed(CourseRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                String[][] lessons = {
                    {"唐诗中的月亮意象", "语文", "高二"},
                    {"二次函数的图像与性质", "数学", "九年级"},
                    {"Travel Plans：旅行情境口语", "英语", "八年级"},
                    {"丝绸之路：跨文明交流", "历史", "七年级"},
                    {"季风气候与我们的生活", "地理", "八年级"},
                    {"光合作用的过程与意义", "生物", "七年级"},
                    {"酸碱中和反应", "化学", "九年级"},
                    {"网络生活中的权利与责任", "道德与法治", "八年级"},
                    {"牛顿第二定律", "物理", "高一"}
                };
                for (String[] lesson : lessons) {
                    Course course = new Course(lesson[0], lesson[1], lesson[2]);
                    course.update(course.getTitle(), course.getSubject(), course.getGrade(), "PUBLISHED");
                    repository.save(course);
                }
            }
        };
    }
}
