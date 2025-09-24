document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    // Form for adding data
    const dataForm = document.getElementById('dataForm');
    const dataContainer = document.getElementById('dataContainer');
    const loadingMessage = document.getElementById('loadingMessage');
    
    // Header elements
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutButton = document.getElementById('logoutButton');

    // Edit Modal elements
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const cancelEditButton = document.getElementById('cancelEdit');
    const editNoteId = document.getElementById('editNoteId');
    const editTitle = document.getElementById('editTitle');
    const editContent = document.getElementById('editContent');

    // If no token exists, redirect to the login page immediately.
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Set welcome message in the header
    if (welcomeMessage && username) {
        welcomeMessage.textContent = `Welcome, ${username}!`;
    }

    // Function to fetch all notes from the server
    const fetchData = async () => {
        try {
            const response = await fetch('/api/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch data. Please log in again.');

            const dataItems = await response.json();
            loadingMessage.style.display = 'none';
            dataContainer.innerHTML = ''; // Clear existing notes

            if (dataItems.length === 0) {
                dataContainer.innerHTML = '<p class="text-gray-400 text-center py-8">You have no saved notes. Add one to get started!</p>';
            } else {
                dataItems.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'note-card bg-white/5 p-4 rounded-lg shadow-md border border-white/10';
                    itemElement.innerHTML = `
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-lg font-bold text-cyan-400">${item.title}</h3>
                            <div class="flex space-x-3">
                                <button data-id="${item._id}" data-title="${encodeURIComponent(item.title)}" data-content="${encodeURIComponent(item.content)}" class="edit-btn text-blue-400 hover:text-blue-600" title="Edit">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z"></path></svg>
                                </button>
                                <button data-id="${item._id}" class="delete-btn text-red-500 hover:text-red-700" title="Delete">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                        <p class="text-gray-300 whitespace-pre-wrap">${item.content}</p>
                    `;
                    dataContainer.appendChild(itemElement);
                });
            }
        } catch (error) {
            alert(error.message);
            logout();
        }
    };

    // Event listener for adding a new note
    dataForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        try {
            const response = await fetch('/api/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, content })
            });
            if (!response.ok) throw new Error('Failed to save note.');
            
            dataForm.reset();
            fetchData(); // Refresh the list
        } catch (error) {
            alert(error.message);
        }
    });

    // Event listener for the entire notes container (handles both edit and delete clicks)
    dataContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        // Handle Edit Button Click
        if (editBtn) {
            const id = editBtn.dataset.id;
            const title = decodeURIComponent(editBtn.dataset.title);
            const content = decodeURIComponent(editBtn.dataset.content);
            
            editNoteId.value = id;
            editTitle.value = title;
            editContent.value = content;
            editModal.classList.remove('hidden');
        }

        // Handle Delete Button Click
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Are you sure you want to delete this note?')) {
                try {
                    const response = await fetch(`/api/data/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Failed to delete note.');
                    fetchData();
                } catch (error) {
                    alert(error.message);
                }
            }
        }
    });

    // --- Modal Logic ---
    const closeModal = () => {
        editModal.classList.add('hidden');
    };

    // Handle saving changes from the edit modal
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editNoteId.value;
        const updatedData = {
            title: editTitle.value,
            content: editContent.value
        };
        try {
            const response = await fetch(`/api/data/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });
            if (!response.ok) throw new Error('Failed to update note.');
            
            closeModal();
            fetchData();
        } catch (error) {
            alert(error.message);
        }
    });

    cancelEditButton.addEventListener('click', closeModal);

    // Logout functionality
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = '/';
    };
    logoutButton.addEventListener('click', logout);

    // Initial fetch of data when the page loads
    fetchData();
});