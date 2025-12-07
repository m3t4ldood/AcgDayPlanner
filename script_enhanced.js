// Advanced Day Planner Application
// Features: Task management, Weather API, Time tracking, Local storage

class DayPlannerApp {
    constructor() {
        this.tasks = [];
        this.notes = '';
        this.currentFilter = 'all';
        this.settings = {
            workStartTime: '09:00',
            workEndTime: '17:00',
            location: 'New York',
            theme: 'light'
        };
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadTasks();
        this.loadNotes();
        this.setupEventListeners();
        this.updateDateTime();
        this.fetchWeather();
        this.renderSchedule();
        this.updateStats();
        
        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
        // Update weather every 30 minutes
        setInterval(() => this.fetchWeather(), 30 * 60000);
    }

    setupEventListeners() {
        // Add Task Form
        document.getElementById('addTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Save Notes
        document.getElementById('saveNotesBtn').addEventListener('click', () => {
            this.saveNotes();
        });

        // Category Filters
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.category;
                this.renderSchedule();
            });
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('todayBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToCurrentTime();
        });
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const timeInput = document.getElementById('timeInput');
        const categorySelect = document.getElementById('categorySelect');
        const prioritySelect = document.getElementById('prioritySelect');
        const taskDetails = document.getElementById('taskDetails');

        if (!taskInput.value.trim() || !timeInput.value) {
            alert('Please fill in task and time fields');
            return;
        }

        const task = {
            id: Date.now(),
            title: taskInput.value.trim(),
            time: timeInput.value,
            category: categorySelect.value,
            priority: prioritySelect.value,
            details: taskDetails.value.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderSchedule();
        this.updateStats();
        
        // Reset form
        document.getElementById('addTaskForm').reset();
        taskInput.focus();
        
        // Show confirmation
        this.showNotification('Task added successfully!', 'success');
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderSchedule();
        this.updateStats();
        this.showNotification('Task deleted!', 'info');
    }

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderSchedule();
            this.updateStats();
        }
    }

    renderSchedule() {
        const container = document.getElementById('scheduleContainer');
        container.innerHTML = '';

        let filteredTasks = this.tasks;
        if (this.currentFilter !== 'all') {
            filteredTasks = this.tasks.filter(task => task.category === this.currentFilter);
        }

        // Sort by time
        filteredTasks.sort((a, b) => a.time.localeCompare(b.time));

        const currentHour = new moment().hours();
        const currentMinute = new moment().minutes();

        filteredTasks.forEach(task => {
            const [taskHour, taskMinute] = task.time.split(':').map(Number);
            let timeStatus = 'future';
            
            if (taskHour < currentHour || (taskHour === currentHour && taskMinute < currentMinute)) {
                timeStatus = 'past';
            } else if (taskHour === currentHour && taskMinute >= currentMinute - 5 && taskMinute <= currentMinute + 5) {
                timeStatus = 'present';
            }

            const blockEl = document.createElement('div');
            blockEl.className = `time-block ${task.category} ${timeStatus} ${task.completed ? 'completed' : ''}`;
            blockEl.dataset.taskId = task.id;

            const priorityClass = `priority-${task.priority}`;
            const categoryLabel = this.getCategoryLabel(task.category);
            
            blockEl.innerHTML = `
                <div class="time-block-header">
                    <div>
                        <span class="time-block-time">${task.time}</span>
                        <span class="time-block-category">${categoryLabel}</span>
                    </div>
                    <div>
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    </div>
                </div>
                <div class="time-block-title">${this.escapeHtml(task.title)}</div>
                ${task.details ? `<div class="time-block-details">${this.escapeHtml(task.details)}</div>` : ''}
                <div>
                    <span class="time-block-priority ${priorityClass}">${task.priority.toUpperCase()}</span>
                </div>
                <div class="time-block-actions">
                    <button class="btn-edit" title="Edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" title="Delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;

            // Event listeners
            blockEl.querySelector('.task-checkbox').addEventListener('change', () => {
                this.toggleTaskComplete(task.id);
            });

            blockEl.querySelector('.btn-edit').addEventListener('click', () => {
                this.editTask(task);
            });

            blockEl.querySelector('.btn-delete').addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteTask(task.id);
                }
            });

            blockEl.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('input')) {
                    this.showTaskDetails(task);
                }
            });

            container.appendChild(blockEl);
        });

        if (filteredTasks.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No tasks scheduled. Add one to get started!</div>';
        }
    }

    editTask(task) {
        document.getElementById('taskInput').value = task.title;
        document.getElementById('timeInput').value = task.time;
        document.getElementById('categorySelect').value = task.category;
        document.getElementById('prioritySelect').value = task.priority;
        document.getElementById('taskDetails').value = task.details;

        // Scroll to form
        document.getElementById('addTaskForm').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('taskInput').focus();

        // Delete the old task
        const oldTasks = [...this.tasks];
        this.deleteTask(task.id);
        this.tasks = oldTasks; // Restore to prevent deletion
        this.tasks = this.tasks.filter(t => t.id !== task.id);
    }

    showTaskDetails(task) {
        const modalTitle = document.getElementById('taskModalTitle');
        const modalBody = document.getElementById('taskModalBody');
        const deleteBtn = document.getElementById('deleteTaskBtn');

        modalTitle.textContent = task.title;
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-6">
                    <strong>Time:</strong> ${task.time}
                </div>
                <div class="col-6">
                    <strong>Category:</strong> ${this.getCategoryLabel(task.category)}
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-6">
                    <strong>Priority:</strong> <span class="badge badge-${this.getPriorityBadgeClass(task.priority)}">${task.priority.toUpperCase()}</span>
                </div>
                <div class="col-6">
                    <strong>Status:</strong> ${task.completed ? '<span class="badge badge-success">Completed</span>' : '<span class="badge badge-warning">Pending</span>'}
                </div>
            </div>
            ${task.details ? `<div class="mt-3"><strong>Details:</strong><p>${this.escapeHtml(task.details)}</p></div>` : ''}
            <div class="mt-3">
                <strong>Created:</strong> ${new Date(task.createdAt).toLocaleString()}
            </div>
        `;

        deleteBtn.onclick = () => {
            if (confirm('Delete this task?')) {
                this.deleteTask(task.id);
                $('#taskModal').modal('hide');
            }
        };

        $('#taskModal').modal('show');
    }

    updateDateTime() {
        const now = moment();
        document.getElementById('currentDate').textContent = now.format('dddd, MMMM D, YYYY');
        document.getElementById('currentTime').textContent = now.format('h:mm A');
    }

    async fetchWeather() {
        try {
            const location = this.settings.location || 'New York';
            // Using Open-Meteo API (free, no API key required)
            const geocodingResponse = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
            );
            const geocodingData = await geocodingResponse.json();

            if (!geocodingData.results || geocodingData.results.length === 0) {
                throw new Error('Location not found');
            }

            const { latitude, longitude, name } = geocodingData.results[0];

            const weatherResponse = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&timezone=auto`
            );
            const weatherData = await weatherResponse.json();
            const current = weatherData.current;

            this.displayWeather(current.temperature_2m, current.weather_code, current.wind_speed_10m, name);
        } catch (error) {
            console.error('Weather fetch error:', error);
            document.getElementById('weatherContainer').innerHTML = `
                <p class="text-center text-muted"><i class="fas fa-cloud-slash"></i> Weather unavailable</p>
            `;
        }
    }

    displayWeather(temp, weatherCode, windSpeed, location) {
        const weatherIcon = this.getWeatherIcon(weatherCode);
        const weatherDesc = this.getWeatherDescription(weatherCode);

        document.getElementById('weatherContainer').innerHTML = `
            <div class="text-center">
                <div class="weather-icon">${weatherIcon}</div>
                <div class="temperature">${Math.round(temp)}°F</div>
                <div class="weather-description">${weatherDesc}</div>
                <small>${location}</small>
                <div style="font-size: 0.8rem; margin-top: 0.5rem;">
                    <i class="fas fa-wind"></i> ${Math.round(windSpeed)} mph
                </div>
            </div>
        `;
    }

    getWeatherIcon(code) {
        if (code === 0) return '<i class="fas fa-sun" style="color: #ffd700;"></i>';
        if (code === 1 || code === 2) return '<i class="fas fa-cloud-sun"></i>';
        if (code === 3 || code === 45) return '<i class="fas fa-cloud"></i>';
        if (code === 48 || code === 51 || code === 53 || code === 55) return '<i class="fas fa-cloud-rain"></i>';
        if (code === 61 || code === 63 || code === 65) return '<i class="fas fa-cloud-rain"></i>';
        if (code === 71 || code === 73 || code === 75 || code === 77) return '<i class="fas fa-snowflake"></i>';
        if (code >= 80 && code <= 82) return '<i class="fas fa-cloud-rain"></i>';
        if (code >= 85 && code <= 86) return '<i class="fas fa-snowflake"></i>';
        if (code === 95 || code === 96 || code === 99) return '<i class="fas fa-bolt"></i>';
        return '<i class="fas fa-question"></i>';
    }

    getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Foggy',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            77: 'Snow grains',
            80: 'Slight showers',
            81: 'Moderate showers',
            82: 'Violent showers',
            85: 'Light snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with hail',
            99: 'Thunderstorm with hail'
        };
        return descriptions[code] || 'Unknown';
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const remaining = total - completed;
        const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('remainingCount').textContent = remaining;
        document.getElementById('productivityScore').textContent = productivity + '%';

        // Category counts
        const categories = ['work', 'personal', 'meeting', 'important'];
        categories.forEach(cat => {
            const count = this.tasks.filter(t => t.category === cat).length;
            document.getElementById(`${cat}Count`).textContent = count;
        });

        // Update upcoming tasks
        this.updateUpcomingTasks();
    }

    updateUpcomingTasks() {
        const upcomingList = document.getElementById('upcomingList');
        const now = moment();
        const upcoming = this.tasks
            .filter(t => !t.completed && moment(`${new Date().toISOString().split('T')[0]} ${t.time}`).isAfter(now))
            .sort((a, b) => a.time.localeCompare(b.time))
            .slice(0, 5);

        if (upcoming.length === 0) {
            upcomingList.innerHTML = '<p class="text-muted text-center">No upcoming tasks</p>';
            return;
        }

        upcomingList.innerHTML = upcoming.map(task => `
            <div class="upcoming-item">
                <div>
                    <div class="upcoming-time">${task.time}</div>
                    <div class="upcoming-task">${this.escapeHtml(task.title)}</div>
                </div>
                <span class="badge badge-primary">${task.category}</span>
            </div>
        `).join('');
    }

    scrollToCurrentTime() {
        const now = moment().format('HH:mm');
        const targetBlock = document.querySelector(`[data-task-id]`);
        if (targetBlock) {
            targetBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showSettingsModal() {
        document.getElementById('workStartTime').value = this.settings.workStartTime;
        document.getElementById('workEndTime').value = this.settings.workEndTime;
        document.getElementById('locationInput').value = this.settings.location;
        document.getElementById('themeSelect').value = this.settings.theme;
        $('#settingsModal').modal('show');
    }

    saveSettings() {
        this.settings.workStartTime = document.getElementById('workStartTime').value;
        this.settings.workEndTime = document.getElementById('workEndTime').value;
        this.settings.location = document.getElementById('locationInput').value;
        this.settings.theme = document.getElementById('themeSelect').value;

        localStorage.setItem('plannerSettings', JSON.stringify(this.settings));
        this.fetchWeather();
        $('#settingsModal').modal('hide');
        this.showNotification('Settings saved!', 'success');
    }

    loadSettings() {
        const saved = localStorage.getItem('plannerSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }

    saveTasks() {
        localStorage.setItem('plannerTasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const saved = localStorage.getItem('plannerTasks');
        if (saved) {
            try {
                this.tasks = JSON.parse(saved);
            } catch (e) {
                console.error('Error loading tasks:', e);
                this.tasks = [];
            }
        }
    }

    saveNotes() {
        this.notes = document.getElementById('notesArea').value;
        localStorage.setItem('plannerNotes', this.notes);
        this.showNotification('Notes saved!', 'success');
    }

    loadNotes() {
        const saved = localStorage.getItem('plannerNotes');
        if (saved) {
            this.notes = saved;
            document.getElementById('notesArea').value = this.notes;
        }
    }

    getCategoryLabel(category) {
        const labels = {
            work: '💼 Work',
            personal: '👤 Personal',
            meeting: '👥 Meeting',
            important: '⚠️ Important'
        };
        return labels[category] || category;
    }

    getPriorityBadgeClass(priority) {
        if (priority === 'high') return 'danger';
        if (priority === 'medium') return 'warning';
        return 'success';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Simple notification - you can enhance this with a toast library
        const alertClass = `alert-${type}`;
        const alert = document.createElement('div');
        alert.className = `alert ${alertClass} alert-dismissible fade show`;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert">
                <span>&times;</span>
            </button>
        `;
        document.body.appendChild(alert);
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    // Export tasks as JSON
    exportTasks() {
        const data = JSON.stringify(this.tasks, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks_${moment().format('YYYY-MM-DD')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import tasks from JSON
    importTasks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    this.tasks = [...this.tasks, ...imported];
                    this.saveTasks();
                    this.renderSchedule();
                    this.updateStats();
                    this.showNotification('Tasks imported successfully!', 'success');
                }
            } catch (error) {
                this.showNotification('Error importing tasks', 'danger');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.plannerApp = new DayPlannerApp();
});
