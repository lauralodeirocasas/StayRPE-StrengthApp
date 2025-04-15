package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {

		SpringApplication.run(DemoApplication.class, args);
		String password = "lau123";
		String encoded = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(password);
		System.out.println("Hash real para 'admin123': " + encoded);
	}

}
