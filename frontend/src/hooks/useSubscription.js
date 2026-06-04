import { useEffect, useState } from "react";
import api from "../api/axios";

export default function useSubscription() {
  const [user, setUser] =
    useState(null);

  const loadUser = async () => {
    try {
      const res =
        await api.get("/auth/me");

      setUser(res.data);

      localStorage.setItem(
        "user",
        JSON.stringify(res.data)
      );
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return {
    user,
    refreshUser: loadUser,
  };
}