package com.example.stayrpe.repository;

import com.example.stayrpe.model.UserProfile;
import com.example.stayrpe.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByUsuario(Usuario usuario);
}