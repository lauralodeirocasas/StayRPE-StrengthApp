// src/main/java/com/example/demo/model/Usuario.java
package com.example.demo.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Data                       // Genera getters, setters, toString, equals, hashCode
@NoArgsConstructor          // Constructor vacío
@AllArgsConstructor         // Constructor con todos los campos
@Builder                    // Permite usar patrón builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    // Nuevos campos personales
    @Column
    private String firstName;

    @Column
    private String lastName;

    private boolean enabled = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "usuario_roles", joinColumns = @JoinColumn(name = "usuario_id"))
    @Column(name = "rol")
    private Set<String> roles;
}