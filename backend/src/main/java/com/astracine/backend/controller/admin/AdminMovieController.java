package com.astracine.backend.controller.admin;

import com.astracine.backend.dto.MovieRequest;
import com.astracine.backend.dto.MovieResponse;
import com.astracine.backend.service.MovieService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
<<<<<<< HEAD
@RequestMapping("/api/admin/movies")
=======

@RequestMapping("/admin/movies")
>>>>>>> 9e86ed7ab229e096bde335ced0312381a6d208e9
@RequiredArgsConstructor
public class AdminMovieController {

    private final MovieService movieService;

    @GetMapping
    public ResponseEntity<List<MovieResponse>> getAllMovies(
            @RequestParam(required = false) String status) {
        List<MovieResponse> movies;
        if (status != null && !status.isEmpty()) {
            movies = movieService.getMoviesByStatus(status);
        } else {
            movies = movieService.getAllMovies();
        }
        return ResponseEntity.ok(movies);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieResponse> getMovieById(@PathVariable Long id) {
        MovieResponse movie = movieService.getMovieById(id);
        return ResponseEntity.ok(movie);
    }

    @GetMapping("/search")
    public ResponseEntity<List<MovieResponse>> searchMovies(
            @RequestParam String title) {
        List<MovieResponse> movies = movieService.searchMoviesByTitle(title);
        return ResponseEntity.ok(movies);
    }

    @GetMapping("/genre/{genreId}")
    public ResponseEntity<List<MovieResponse>> getMoviesByGenre(
            @PathVariable Long genreId) {
        List<MovieResponse> movies = movieService.getMoviesByGenre(genreId);
        return ResponseEntity.ok(movies);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MovieResponse> createMovie(
            @Valid @ModelAttribute MovieRequest request,
            @RequestParam(required = false) MultipartFile poster,
            @RequestParam(required = false) MultipartFile trailer) {
        MovieResponse createdMovie = movieService.createMovie(request, poster, trailer);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdMovie);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MovieResponse> updateMovie(
            @PathVariable Long id,
            @Valid @ModelAttribute MovieRequest request,
            @RequestParam(required = false) MultipartFile poster,
            @RequestParam(required = false) MultipartFile trailer) {
        MovieResponse updatedMovie = movieService.updateMovie(id, request, poster, trailer);
        return ResponseEntity.ok(updatedMovie);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMovie(@PathVariable Long id) {
        movieService.deleteMovie(id);
        return ResponseEntity.noContent().build();
    }
}
