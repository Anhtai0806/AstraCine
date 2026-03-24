package com.astracine.backend.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.astracine.backend.core.entity.Room;

public interface RoomRepository extends JpaRepository<Room, Long> {
}
