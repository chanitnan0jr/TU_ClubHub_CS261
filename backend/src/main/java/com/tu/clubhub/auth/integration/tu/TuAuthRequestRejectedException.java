package com.tu.clubhub.auth.integration.tu;

/** The TU API rejected a request that was not identified as invalid user credentials. */
public class TuAuthRequestRejectedException extends RuntimeException {

	public TuAuthRequestRejectedException() {
		super("TU Authentication API rejected the authentication request");
	}
}
