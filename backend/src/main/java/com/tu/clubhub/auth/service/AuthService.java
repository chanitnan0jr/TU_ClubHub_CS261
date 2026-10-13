package com.tu.clubhub.auth.service;

import com.tu.clubhub.auth.dto.UserResponse;

public interface AuthService {

    // ตรวจบัญชีกับ TU API แล้วค้นหาหรือสร้างผู้ใช้ภายใน
    // อ่านสิทธิ์จากฐานข้อมูล ไม่รับสิทธิ์จากคำขอ Login
    // ห้ามเก็บหรือบันทึกรหัสผ่านมหาวิทยาลัยลง log
    UserResponse login(String username, String password);

    // อ่านข้อมูล สิทธิ์ และสถานะบัญชีล่าสุดจากฐานข้อมูล
    UserResponse currentUser(Long userId);
}