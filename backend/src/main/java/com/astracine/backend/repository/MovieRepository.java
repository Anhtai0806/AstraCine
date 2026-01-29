package com.astracine.backend.repository;

import com.astracine.backend.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

    List<Movie> findByStatus(String status);

    List<Movie> findByTitleContainingIgnoreCase(String title);

    @Query("SELECT m FROM Movie m WHERE m.releaseDate <= :date AND (m.endDate IS NULL OR m.endDate >= :date)")
    List<Movie> findMoviesShowingOnDate(@Param("date") LocalDate date);

    @Query("SELECT m FROM Movie m JOIN m.genres g WHERE g.id = :genreId")
    List<Movie> findByGenreId(@Param("genreId") Long genreId);

    @Query("SELECT m FROM Movie m WHERE m.status = :status ORDER BY m.createdAt DESC")
    List<Movie> findByStatusOrderByCreatedAtDesc(@Param("status") String status);

    List<Movie> findTop4ByStatusOrderByEndDateAsc(String status);

    List<Movie> findTop4ByStatusOrderByReleaseDateAsc(String status);
}
