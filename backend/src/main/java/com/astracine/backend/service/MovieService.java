package com.astracine.backend.service;

import com.astracine.backend.dto.GenreDTO;
import com.astracine.backend.dto.MovieRequest;
import com.astracine.backend.dto.MovieResponse;
import com.astracine.backend.entity.Genre;
import com.astracine.backend.entity.Movie;
import com.astracine.backend.repository.GenreRepository;
import com.astracine.backend.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MovieService {

    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final FileStorageService fileStorageService;

    public List<MovieResponse> getAllMovies() {
        return movieRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<MovieResponse> getMoviesByStatus(String status) {
        return movieRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<MovieResponse> getNowShowingMovies() {
        return movieRepository.findTop4ByStatusOrderByEndDateAsc("NOW_SHOWING").stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<MovieResponse> getComingSoonMovies() {
        return movieRepository.findTop4ByStatusOrderByReleaseDateAsc("COMING_SOON").stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public MovieResponse getMovieById(Long id) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movie not found with id: " + id));
        return convertToResponse(movie);
    }

    public List<MovieResponse> searchMovies(String status, String title, Long genreId) {
        return movieRepository.searchMovies(status, title, genreId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<MovieResponse> searchMoviesByTitle(String title) {
        return movieRepository.findByTitleContainingIgnoreCase(title).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<MovieResponse> getMoviesByGenre(Long genreId) {
        return movieRepository.findByGenreId(genreId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<GenreDTO> getAllGenres() {
        return genreRepository.findAll().stream()
                .map(genre -> new GenreDTO(genre.getId(), genre.getName()))
                .collect(Collectors.toList());
    }

    public MovieResponse createMovie(MovieRequest request, MultipartFile posterFile, MultipartFile trailerFile) {
        Movie movie = new Movie();
        updateMovieFromRequest(movie, request);

        // Handle poster upload
        if (posterFile != null && !posterFile.isEmpty()) {
            if (!fileStorageService.isValidImageFile(posterFile)) {
                throw new RuntimeException("Invalid image file. Only JPEG, PNG, and WebP are allowed.");
            }
            String posterPath = fileStorageService.storeFile(posterFile);
            movie.setPosterUrl(posterPath);
        }

        // Handle trailer upload
        if (trailerFile != null && !trailerFile.isEmpty()) {
            if (!fileStorageService.isValidVideoFile(trailerFile)) {
                throw new RuntimeException("Invalid video file. Only MP4, WebM, MOV, and AVI are allowed.");
            }
            String trailerPath = fileStorageService.storeVideoFile(trailerFile);
            movie.setTrailerUrl(trailerPath);
        }

        Movie savedMovie = movieRepository.save(movie);
        return convertToResponse(savedMovie);
    }

    public MovieResponse updateMovie(Long id, MovieRequest request, MultipartFile posterFile,
            MultipartFile trailerFile) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movie not found with id: " + id));

        updateMovieFromRequest(movie, request);

        // Delete old poster if new one is uploaded
        if (posterFile != null && !posterFile.isEmpty()) {
            if (!fileStorageService.isValidImageFile(posterFile)) {
                throw new RuntimeException("Invalid image file. Only JPEG, PNG, and WebP are allowed.");
            }

            // Delete old poster
            if (movie.getPosterUrl() != null) {
                fileStorageService.deleteFile(movie.getPosterUrl());
            }

            // Upload new poster
            String posterPath = fileStorageService.storeFile(posterFile);
            movie.setPosterUrl(posterPath);
        }

        // Delete old trailer if new one is uploaded
        if (trailerFile != null && !trailerFile.isEmpty()) {
            if (!fileStorageService.isValidVideoFile(trailerFile)) {
                throw new RuntimeException("Invalid video file. Only MP4, WebM, MOV, and AVI are allowed.");
            }

            // Delete old trailer
            if (movie.getTrailerUrl() != null) {
                fileStorageService.deleteVideoFile(movie.getTrailerUrl());
            }

            // Upload new trailer
            String trailerPath = fileStorageService.storeVideoFile(trailerFile);
            movie.setTrailerUrl(trailerPath);
        }

        Movie updatedMovie = movieRepository.save(movie);
        return convertToResponse(updatedMovie);
    }

    public void deleteMovie(Long id) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movie not found with id: " + id));

        // Delete poster file
        if (movie.getPosterUrl() != null) {
            fileStorageService.deleteFile(movie.getPosterUrl());
        }

        // Delete trailer file
        if (movie.getTrailerUrl() != null) {
            fileStorageService.deleteVideoFile(movie.getTrailerUrl());
        }

        movieRepository.deleteById(id);
    }

    private void updateMovieFromRequest(Movie movie, MovieRequest request) {
        movie.setTitle(request.getTitle());
        movie.setDescription(request.getDescription());
        movie.setDurationMinutes(request.getDurationMinutes());
        movie.setReleaseDate(request.getReleaseDate());
        movie.setEndDate(request.getEndDate());
        movie.setAgeRating(request.getAgeRating());
        movie.setTrailerUrl(request.getTrailerUrl());

        if (request.getStatus() != null) {
            movie.setStatus(request.getStatus());
        }

        // Update genres
        if (request.getGenreIds() != null && !request.getGenreIds().isEmpty()) {
            Set<Genre> genres = new HashSet<>();
            for (Long genreId : request.getGenreIds()) {
                Genre genre = genreRepository.findById(genreId)
                        .orElseThrow(() -> new RuntimeException("Genre not found with id: " + genreId));
                genres.add(genre);
            }
            movie.setGenres(genres);
        }
    }

    private MovieResponse convertToResponse(Movie movie) {
        MovieResponse response = new MovieResponse();
        response.setId(movie.getId());
        response.setTitle(movie.getTitle());
        response.setDescription(movie.getDescription());
        response.setDurationMinutes(movie.getDurationMinutes());
        response.setReleaseDate(movie.getReleaseDate());
        response.setEndDate(movie.getEndDate());
        response.setAgeRating(movie.getAgeRating());
        response.setStatus(movie.getStatus());
        response.setPosterUrl(movie.getPosterUrl());
        response.setTrailerUrl(movie.getTrailerUrl());
        response.setCreatedAt(movie.getCreatedAt());

        // Convert genres
        Set<GenreDTO> genreDTOs = movie.getGenres().stream()
                .map(genre -> new GenreDTO(genre.getId(), genre.getName()))
                .collect(Collectors.toSet());
        response.setGenres(genreDTOs);

        return response;
    }
}
