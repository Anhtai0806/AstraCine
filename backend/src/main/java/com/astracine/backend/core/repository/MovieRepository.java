package com.astracine.backend.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.enums.MovieStatus;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

        List<Movie> findByStatus(MovieStatus status);

        long countByStatus(MovieStatus status);

        List<Movie> findByTitleContainingIgnoreCase(String title);

        @Query("SELECT m FROM Movie m WHERE m.releaseDate <= :date AND (m.endDate IS NULL OR m.endDate >= :date)")
        List<Movie> findMoviesShowingOnDate(@Param("date") LocalDate date);

        @Query("SELECT m FROM Movie m JOIN m.genres g WHERE g.id = :genreId")
        List<Movie> findByGenreId(@Param("genreId") Long genreId);

        @Query("SELECT m FROM Movie m WHERE m.status = :status ORDER BY m.createdAt DESC")
        List<Movie> findByStatusOrderByCreatedAtDesc(@Param("status") MovieStatus status);

        List<Movie> findTop4ByStatusOrderByEndDateAsc(MovieStatus status);

        List<Movie> findTop4ByStatusOrderByReleaseDateAsc(MovieStatus status);

        @Modifying
        @Query("UPDATE Movie m SET m.status = com.astracine.backend.core.enums.MovieStatus.STOPPED " +
                        "WHERE m.endDate IS NOT NULL AND m.endDate < :today AND m.status <> com.astracine.backend.core.enums.MovieStatus.STOPPED")
        int markStoppedMovies(@Param("today") LocalDate today);

        @Modifying
        @Query("UPDATE Movie m SET m.status = com.astracine.backend.core.enums.MovieStatus.COMING_SOON " +
                        "WHERE m.releaseDate > :today AND m.status <> com.astracine.backend.core.enums.MovieStatus.COMING_SOON")
        int markComingSoonMovies(@Param("today") LocalDate today);

        @Modifying
        @Query("UPDATE Movie m SET m.status = com.astracine.backend.core.enums.MovieStatus.NOW_SHOWING " +
                        "WHERE m.releaseDate <= :today AND (m.endDate IS NULL OR m.endDate >= :today) " +
                        "AND m.status <> com.astracine.backend.core.enums.MovieStatus.NOW_SHOWING")
        int markNowShowingMovies(@Param("today") LocalDate today);

        @Query("SELECT DISTINCT m FROM Movie m LEFT JOIN m.genres g WHERE " +
                        "(:status IS NULL OR m.status = :status) AND " +
                        "(:title IS NULL OR LOWER(m.title) LIKE LOWER(CONCAT('%', :title, '%'))) AND " +
                        "(:genreId IS NULL OR g.id = :genreId)")
        List<Movie> searchMovies(@Param("status") MovieStatus status, @Param("title") String title,
                        @Param("genreId") Long genreId);
}
