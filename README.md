# Task Tracker REST API

A backend REST API developed using Node.js, Express.js, and MySQL to manage tasks efficiently.

## Features

- Create new tasks
- Retrieve all tasks or a specific task by ID
- Update tasks using PUT and PATCH
- Delete tasks
- Filter tasks by status and priority
- Sort tasks by supported fields
- Validate task inputs
- Store task data persistently in MySQL
- Test API endpoints using Postman

## Technologies Used

- JavaScript
- Node.js
- Express.js
- MySQL
- Postman

## API Endpoints

| HTTP Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check whether the API server is running |
| GET | `/tasks` | Retrieve tasks, with optional filtering and sorting |
| GET | `/tasks/:id` | Retrieve a task by ID |
| POST | `/tasks` | Create a new task |
| PUT | `/tasks/:id` | Replace a task |
| PATCH | `/tasks/:id` | Update selected task fields |
| DELETE | `/tasks/:id` | Delete a task |

## Getting Started

### Prerequisites

- Node.js and npm
- MySQL
- Postman (for API testing)

### Installation

1. Clone this repository:

   `git clone https://github.com/salmaharis060-dotcom/task-tracker-rest-api.git`

2. Navigate into the project folder:

   `cd task-tracker-rest-api`

3. Install the dependencies:

   `npm install`

4. Configure the MySQL database and create the required `tasks` table.

5. Configure your database connection using the environment variables or settings expected by `db.js`. Keep credentials private.

6. Start the server using the appropriate start command defined in `package.json`.

7. Test the API using Postman at `http://localhost:3001`.

## What I Learned

- Building REST API endpoints with Express.js
- Implementing CRUD operations
- Connecting a Node.js backend to MySQL
- Validating request data and handling errors
- Implementing sorting and filtering
- Testing APIs using Postman

