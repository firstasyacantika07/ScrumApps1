import api from '../api/axios';

export const getProjects = async () => {
    try {
        const response = await api.get('/projects');
        return response.data; // Mengambil data dari tbr_projects
    } catch (error) {
        console.error("Gagal mengambil data proyek:", error);
        throw error;
    }
};

export const getProjectBacklogs = async (projectId) => {
    try {
        const response = await api.get(`/projects/${projectId}/backlogs`);
        return response.data; // Mengambil data dari tbr_backlogs
    } catch (error) {
        console.error("Gagal mengambil backlog:", error);
        throw error;
    }
};