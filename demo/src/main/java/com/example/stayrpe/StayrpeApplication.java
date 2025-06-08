package com.example.stayrpe;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class StayrpeApplication {

	public static void main(String[] args) {

		SpringApplication.run(StayrpeApplication.class, args);
		String password = "lau123";
		String encoded = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(password);
		System.out.println("Hash real para 'admin123': " + encoded);


	}

}
