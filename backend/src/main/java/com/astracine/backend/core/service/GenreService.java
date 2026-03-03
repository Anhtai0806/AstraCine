package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Genre;
import com.astracine.backend.core.repository.GenreRepository;
import com.astracine.backend.presentation.dto.movie.GenreDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class GenreService {

    private final GenreRepository genreRepository;

    public List<GenreDTO> getAllGenres() {
        return genreRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public GenreDTO getGenreById(Long id) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Genre not found with id: " + id));
        return convertToDTO(genre);
    }

    public GenreDTO createGenre(GenreDTO genreDTO) {
        if (genreRepository.existsByName(genreDTO.getName())) {
            throw new RuntimeException("Genre with name '" + genreDTO.getName() + "' already exists");
        }

        Genre genre = new Genre();
        genre.setName(genreDTO.getName());

        Genre savedGenre = genreRepository.save(genre);
        return convertToDTO(savedGenre);
    }

    public GenreDTO updateGenre(Long id, GenreDTO genreDTO) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Genre not found with id: " + id));

        // Check if name is being changed and if new name already exists
        if (!genre.getName().equals(genreDTO.getName()) &&
                genreRepository.existsByName(genreDTO.getName())) {
            throw new RuntimeException("Genre with name '" + genreDTO.getName() + "' already exists");
        }

        genre.setName(genreDTO.getName());
        Genre updatedGenre = genreRepository.save(genre);
        return convertToDTO(updatedGenre);
    }

    public void deleteGenre(Long id) {
        if (!genreRepository.existsById(id)) {
            throw new RuntimeException("Genre not found with id: " + id);
        }
        genreRepository.deleteById(id);
    }

    private GenreDTO convertToDTO(Genre genre) {
        return new GenreDTO(genre.getId(), genre.getName());
    }
}
