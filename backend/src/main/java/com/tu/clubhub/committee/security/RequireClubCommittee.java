package com.tu.clubhub.committee.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Restricts a method to an active committee assignment for its {@code clubId} argument.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@PreAuthorize("@clubSecurity.isCommittee(#clubId)")
public @interface RequireClubCommittee {
}
