// UserProfileRepository.java
package com.example.demo.repository;

import com.example.demo.model.UserProfile;
import com.example.demo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByUsuario(Usuario usuario);
}