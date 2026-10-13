package com.tu.clubhub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityContextRepository contexts() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public CsrfTokenRepository csrfRepository() {
        return new HttpSessionCsrfTokenRepository();
    }

    @Bean
    public SecurityFilterChain security(
            HttpSecurity http,
            SecurityContextRepository contexts,
            CsrfTokenRepository csrf
    ) throws Exception {

        http
            // ใช้ Session เก็บสถานะการเข้าสู่ระบบ
            .securityContext(config -> config
                .securityContextRepository(contexts)
                .requireExplicitSave(true)
            )

            // เปิดการตรวจ CSRF สำหรับคำขอที่เปลี่ยนแปลงข้อมูล
            .csrf(config -> config
                .csrfTokenRepository(csrf)
            )

            // กำหนดเส้นทางที่เปิดให้ใช้ก่อน Login
            .authorizeHttpRequests(config -> config
                .requestMatchers(
                    "/api/v1/auth/csrf",
                    "/api/v1/auth/login",
                    "/error"
                ).permitAll()
                .anyRequest().authenticated()
            )

            // ถ้ายังไม่ได้ Login ให้ตอบ 401 เป็น JSON
            .exceptionHandling(config -> config
                .authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write(
                        "{\"message\":\"Authentication required\"}"
                    );
                })
            )

            // Spring Security จัดการ POST /api/v1/auth/logout
            .logout(config -> config
                .logoutRequestMatcher(
                    PathPatternRequestMatcher.withDefaults()
                        .matcher(
                            HttpMethod.POST,
                            "/api/v1/auth/logout"
                        )
                )
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("SESSION", "JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) ->
                    response.setStatus(204)
                )
            )

            .formLogin(config -> config.disable())
            .httpBasic(config -> config.disable());

        return http.build();
    }
}