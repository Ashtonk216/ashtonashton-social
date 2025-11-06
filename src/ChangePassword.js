import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("current_password", currentPassword);
      formData.append("new_password", newPassword);

      const response = await fetch(
        "https://api.ashtonashton.net/change-password",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to change password");
      }

      // Clear local storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      alert(
        "Password changed successfully! Please log in with your new password."
      );
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "100px auto",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <h2>Change Password</h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          boxSizing: "border-box",
        }}
      >
        <div>
          <label>Current Password:</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label>Confirm New Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              boxSizing: "border-box",
            }}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              boxSizing: "border-box",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChangePassword;
