package com.astracine.backend.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.astracine.backend.core.entity.Room;
import com.astracine.backend.core.enums.RoomStatus;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByStatus(RoomStatus status);

    boolean existsByName(String name);
}
