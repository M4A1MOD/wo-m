package com.zhixue.platform.controller;

import com.zhixue.platform.common.ApiResponse;
import com.zhixue.platform.dto.CourseRequest;
import com.zhixue.platform.entity.Course;
import com.zhixue.platform.repository.CourseRepository;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseController {
    private final CourseRepository repository;
    public CourseController(CourseRepository repository){this.repository=repository;}
    @GetMapping public ApiResponse<List<Course>> list(){return ApiResponse.ok(repository.findAll());}
    @GetMapping("/{id}") public ApiResponse<Course> get(@PathVariable Long id){return ApiResponse.ok(repository.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"课程不存在")));}
    @PostMapping public ApiResponse<Course> create(@Valid @RequestBody CourseRequest request){return ApiResponse.ok(repository.save(new Course(request.title(),request.subject(),request.grade())));}
    @PutMapping("/{id}") public ApiResponse<Course> update(@PathVariable Long id,@Valid @RequestBody CourseRequest request){Course c=repository.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"课程不存在")); c.update(request.title(),request.subject(),request.grade(),request.status()==null?c.getStatus():request.status()); return ApiResponse.ok(repository.save(c));}
    @DeleteMapping("/{id}") public ApiResponse<Void> delete(@PathVariable Long id){if(!repository.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"课程不存在"); repository.deleteById(id); return ApiResponse.ok(null);}
}
