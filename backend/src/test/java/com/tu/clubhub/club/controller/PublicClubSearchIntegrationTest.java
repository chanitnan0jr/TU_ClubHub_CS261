
package com.tu.clubhub.club.controller;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsInAnyOrder;

import org.springframework.transaction.annotation.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "seedtest"})
class PublicClubSearchIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void anonymousUserCanSearchClubs() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20));
    }

    @Test
    void searchReturnsEmptyPageWhenNoClubMatches()
            throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("q",
                                "nonexistent-club-xyz-99999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page.totalElements").value(0))
                .andExpect(jsonPath("$.page.totalPages").value(0));
    }

    @Test
    void supportsSearchFiltersAndPagination()
            throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("categoryId", "30001")
                        .param("tagId", "40001")
                        .param("recruitmentStatus", "OPEN")
                        .param("page", "0")
                        .param("size", "5")
                        .param("sort", "name,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.page.size").value(5));
    }

    @Test
    void rejectsInvalidPageSize() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("size", "101"))
                .andExpect(status().isBadRequest());
    }

    //  ค้นหาภาษาไทย
    @Test
    void searchesThaiClubNameCorrectly() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("q", "ดนตรี"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name")
                        .value("ชมรมดนตรีสากล"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    // ค้นหาภาษาอังกฤษ
    @Test
    void searchesEnglishClubNameCaseInsensitively()
            throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("q", "iot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name")
                        .value("ชมรมหุ่นยนต์และ IoT"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    // ทดสอบกรองชมรมตาม Category
    @Test
    void filtersClubsByCategoryCorrectly() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("categoryId", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(3))
                .andExpect(jsonPath("$.items[*].name",
                        containsInAnyOrder(
                                "ชมรมฟุตบอล",
                                "ชมรมแบดมินตัน",
                                "ชมรมวิ่งเพื่อสุขภาพ"
                        )));
    }

    // ทดสอบกรองชมรมตาม Tag
    @Test
    void filtersClubsByTagCorrectly() throws Exception {

        Long tagId = jdbcTemplate.queryForObject(
                "SELECT id FROM tags WHERE name = ?",
                Long.class,
                "AI"
        );

        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("tagId", String.valueOf(tagId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name")
                        .value("ชมรม AI และวิทยาการข้อมูล"));
    }


    // ทดสอบค้นหาชมรมที่กำลังเปิดรับสมัคร
    @Test
    void filtersOpenRecruitmentCorrectly() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("recruitmentStatus", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[*].name",
                        containsInAnyOrder(
                                "ชมรมเขียนโปรแกรม",
                                "ชมรมฟุตบอล"
                        )));
    }

    // ทดสอบค้นหาชมรมที่ไม่ได้เปิดรับสมัคร
    @Test
    void filtersClosedRecruitmentCorrectly() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("recruitmentStatus", "CLOSED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(8))
                .andExpect(jsonPath("$.items.length()").value(8))
                .andExpect(jsonPath("$.items[*].name",
                        containsInAnyOrder(
                                "ชมรม AI และวิทยาการข้อมูล",
                                "ชมรมหุ่นยนต์และ IoT",
                                "ชมรมวิ่งเพื่อสุขภาพ",
                                "ชมรมแบดมินตัน",
                                "ชมรมดนตรีสากล",
                                "ชมรมถ่ายภาพสร้างสรรค์",
                                "ชมรมอาสาพัฒนาชุมชน",
                                "ชมรมอนุรักษ์สิ่งแวดล้อม"
                        )));
    }


    // ทดสอบการแบ่งหน้า โดยตรวจสอบข้อมูลจริงแต่ละหน้า
    @Test
    void paginatesClubsCorrectly() throws Exception {

        List<String> firstPage = jdbcTemplate.queryForList(
                """
                SELECT name FROM clubs
                WHERE status = 'ACTIVE'
                ORDER BY name ASC, id ASC
                LIMIT 3 OFFSET 0
                """,
                String.class
        );

        List<String> secondPage = jdbcTemplate.queryForList(
                """
                SELECT name FROM clubs
                WHERE status = 'ACTIVE'
                ORDER BY name ASC, id ASC
                LIMIT 3 OFFSET 3
                """,
                String.class
        );

        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("page", "0")
                        .param("size", "3")
                        .param("sort", "name,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(3))
                .andExpect(jsonPath("$.page.totalElements").value(10))
                .andExpect(jsonPath("$.page.totalPages").value(4))
                .andExpect(jsonPath("$.items[*].name", is(firstPage)));

        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("page", "1")
                        .param("size", "3")
                        .param("sort", "name,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.number").value(1))
                .andExpect(jsonPath("$.items[*].name", is(secondPage)));
    }


    // ทดสอบการเรียงชื่อชมรมจากมากไปน้อย
    @Test
    void sortsClubsByNameDescendingCorrectly() throws Exception {

        List<String> expectedNames = jdbcTemplate.queryForList(
                """
                SELECT name FROM clubs
                WHERE status = 'ACTIVE'
                ORDER BY name DESC, id ASC
                LIMIT 5
                """,
                String.class
        );

        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("sort", "name,desc")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.items[*].name", is(expectedNames)));
    }


    // ทดสอบว่าไม่แสดงชมรม INACTIVE
    @Test
    @Transactional
    void excludesInactiveClubsFromSearch() throws Exception {

        int updated = jdbcTemplate.update(
                "UPDATE clubs SET status = 'INACTIVE' WHERE name = ?",
                "ชมรมฟุตบอล"
        );

        assertEquals(1, updated);

        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("q", "ฟุตบอล"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page.totalElements").value(0));
    }


    // ทดสอบการขอหน้าที่เกินจำนวนข้อมูล
    @Test
    void returnsEmptyItemsWhenPageIsOutOfRange()
            throws Exception {

        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("page", "1000")
                        .param("size", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page.number").value(1000))
                .andExpect(jsonPath("$.page.size").value(3))
                .andExpect(jsonPath("$.page.totalElements").value(10))
                .andExpect(jsonPath("$.page.totalPages").value(4));
    }

}
