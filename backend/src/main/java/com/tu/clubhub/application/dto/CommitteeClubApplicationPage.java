package com.tu.clubhub.application.dto;

import java.util.List;

public record CommitteeClubApplicationPage(List<CommitteeClubApplicationSummary> items, Page page) {
    public CommitteeClubApplicationPage { items = List.copyOf(items); }
    public record Page(int number, int size, long totalElements, long totalPages) {}
}
