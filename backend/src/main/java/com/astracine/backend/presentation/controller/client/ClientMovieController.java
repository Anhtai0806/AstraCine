package com.astracine.backend.presentation.controller.client;

import com.astracine.backend.core.service.MovieService;
import com.astracine.backend.presentation.dto.movie.MovieResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/movies")
@RequiredArgsConstructor
public class ClientMovieController {

    private final MovieService movieService;

    @GetMapping("/now-showing")
    public ResponseEntity<List<MovieResponse>> getNowShowingMovies() {
        return ResponseEntity.ok(movieService.getNowShowingMovies());
    }

    @GetMapping("/coming-soon")
    public ResponseEntity<List<MovieResponse>> getComingSoonMovies() {
        return ResponseEntity.ok(movieService.getComingSoonMovies());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieResponse> getMovieById(@org.springframework.web.bind.annotation.PathVariable Long id) {
        return ResponseEntity.ok(movieService.getMovieById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<MovieResponse>> searchMovies(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String status,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String query,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Long genreId) {
        return ResponseEntity.ok(movieService.searchMovies(status, query, genreId));
    }

    @GetMapping("/genres")
    public ResponseEntity<List<com.astracine.backend.presentation.dto.movie.GenreDTO>> getAllGenres() {
        return ResponseEntity.ok(movieService.getAllGenres());
    }
}
