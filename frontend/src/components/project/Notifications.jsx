import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

const Notifications = ({ projectId }) => {

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {

    try {

      const res = await api.get(
        `/projects/${projectId}/notifications`
      );

      setNotifications(res.data);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">

      {notifications.map((notif) => (

        <div
          key={notif.id}
          className="border rounded-2xl p-5"
        >

          <h3 className="font-bold">
            {notif.title}
          </h3>

          <p className="text-sm text-gray-400 mt-2">
            {notif.message}
          </p>

        </div>

      ))}

    </div>
  );
};

export default Notifications;