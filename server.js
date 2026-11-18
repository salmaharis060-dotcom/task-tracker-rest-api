
const express = require("express");

const pool = require("./db");

const app = express();

const PORT = 3001;

app.use(express.json());




function isValidDate(value) {

    // Check that the value is text and follows the required format.
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    // Convert the submitted date into a JavaScript Date object.
    const date = new Date(`${value}T00:00:00.000Z`);

    // Reject invalid dates before calling toISOString().
    if (Number.isNaN(date.getTime())) {
        return false;
    }

    // Reject impossible calendar dates such as 2026-02-30.
    // The converted date must match the original date.
    return date.toISOString().slice(0, 10) === value;
}



// ==================================================
// GET /
// Check whether the API server is running.
// ==================================================

app.get("/", (req, res) => {

    // Send a success response to the client.
    res.status(200).send("Task and Issue Tracker API is running");

});



// ==================================================
// GET /tasks
// Retrieve all tasks from MySQL.
// ==================================================

app.get("/tasks", async (req, res) => {
    const {status, priority} = req.query

    try 
    {
        const allowedPriorities = ["low", "medium", "high"];
        const allowedStatuses = ["pending", "in progress", "completed"];

        if(status && !allowedStatuses.includes(status))
        {
            return res.status(400).json({error: "invalid status"});

        }
        if(priority && !allowedPriorities.includes(priority))
        {
            return res.status(400).json({error: "invalid priority"});

        }
        let query = "SELECT * FROM tasks";
        const cond = [];
        const val = [];

        if(status)
        {
            cond.push("status = ?");
            val.push(status);
        }
        if(priority)
        {
            cond.push("priority = ?");
            val.push(priority);
        }
        if(cond.length > 0)
        {
            query += " where " + cond.join(" and ");
        }
        const allowedsortcol = ["deadline", "created_at", "priority", "title"];
        const sortby = req.query.sortby;
        const order = req.query.order || "asc";

        if(sortby && !allowedsortcol.includes(sortby))
        {
            return res.status(400).json({error: "invalide sort column"});

        }
        if(!["asc", "desc"].includes(order.toLowerCase()))
        {
            return res.status(400).json({error: "invalid sort order"});

        }
        if(sortby)
        {
            query += ` order by ${sortby} ${order.toUpperCase()}`;
        }
        const [tasks] = await pool.execute(query, val);
        return res.status(200).json(tasks);


    } catch (error) {
        console.error("error retrieving task", error.message);

        return res.status(500).json({error: "failed to retrieve tasks"});

    }

});

app.get("/tasks/:id", async (req, res) =>
{
    const id = Number(req.params.id);

    if(!Number.isInteger(id) || id <= 0)
    {
        return res.status(400).json({error: "not a valid id, id must be a positive integer"})
    }

    try
    {
        const [task] = await pool.query("select * from tasks where id = ?", [id]);

        if(task.length === 0)
        {
            return res.status(404).json({error: "task not found"});
        }
        return res.status(200).json(task);
    }
    catch(error)
    {
        console.error("error retrieving the task", error.message);
        return res.status(500).json({error:"failed to retrieve the task"});
    }

});




app.post("/tasks", async (req, res) => {

    try {

        // Get the values sent by the user in the request body.
        const { title, description, priority, status, deadline } = req.body;


        if (typeof title !== "string" || title.trim() === "") {

            return res.status(400).json({
                error: "Title is required and must be non-empty text"
            });

        }

        
        if (
            description !== undefined &&
            description !== null &&
            typeof description !== "string"
        ) {

            return res.status(400).json({
                error: "Description must be text or null"
            });

        }


        // Set the default priority to medium.
        let normalizedPriority = "medium";
        const allowedPriorities = ["low", "medium", "high"];
        


        // If the user supplied a priority, validate it.
        if (priority !== undefined) {

   
            if (typeof priority !== "string") {

                return res.status(400).json({
                    error: "Priority must be low, medium, or high"
                });

            }
      
            normalizedPriority = priority.trim().toLowerCase();

           
            if (!allowedPriorities.includes(normalizedPriority)) {

                return res.status(400).json({
                    error: "Priority must be low, medium, or high"
                });

            }

        }

        let normalizedstatus = "pending";
        const allowedStatuses = ["pending", "in progress", "completed"];
        if(status !== undefined)
        {
            if(typeof status !== "string")
            {
                return res.status(400).json({error: "status must be pending, in progress or completed"});

            }
            normalizedstatus = status.trim().toLowerCase();
            if(!allowedStatuses.includes(normalizedstatus))
            {
                return res.status(400).json({error: "Status must be pending, in progress or completed"});
            }
        }



        // Validate the deadline if the user supplied one.
        // A deadline may be omitted or set to null.
        if (
            deadline !== undefined &&
            deadline !== null &&
            !isValidDate(deadline)
        ) {

            return res.status(400).json({
                error: "Deadline must be a valid date in YYYY-MM-DD format or null"
            });

        }


        // Insert the task into MySQL.
        // Question marks are placeholders for values.
        // Parameterized queries help protect against SQL injection.
        const [result] = await pool.execute(
            `INSERT INTO tasks
             (title, description, priority, status, deadline )
             VALUES (?, ?, ?, ?, ?)`,
            [
                title.trim(),          
                description ?? null,   
                normalizedPriority,
                normalizedstatus,
                deadline ?? null      
            ]
        );


    
        const [rows] = await pool.execute(
            "SELECT * FROM tasks WHERE id = ?",
            [result.insertId]
        );

        return res.status(201).json(rows[0]);

    } catch (error) {


        console.error("Error creating task:", error.message);

        return res.status(500).json({
            error: "Failed to create task"
        });

    }

});




app.patch("/tasks/:id", async (req, res) => {


    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {

        return res.status(400).json({
            error: "Task ID must be a positive integer"
        });

    }

    const allowedFields = [
        "title",
        "description",
        "priority",
        "status",
        "deadline"
    ];

    const updates = req.body;


    // The request body must be a non-empty object.
    // Arrays and null are not accepted as update objects.
    if (
        !updates ||
        typeof updates !== "object" ||
        Array.isArray(updates) ||
        Object.keys(updates).length === 0
    ) {

        return res.status(400).json({
            error: "Provide at least one field to update"
        });

    }

    // Get the names of the fields supplied by the user.
    const fields = Object.keys(updates);

    // Find any field names that are not allowed.
    const invalidFields = fields.filter(
        (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {

        return res.status(400).json({
            error: "Invalid field(s)",
            fields: invalidFields
        });

    }


    if ("title" in updates) {

        if (
            typeof updates.title !== "string" ||
            updates.title.trim() === ""
        ) {

            return res.status(400).json({
                error: "Title must be non-empty text"
            });

        }

        
        updates.title = updates.title.trim();

    }

    if ("description" in updates) {

        if (
            updates.description !== null &&
            typeof updates.description !== "string"
        ) {

            return res.status(400).json({
                error: "Description must be text or null"
            });

        }

    }



    if ("priority" in updates) {

        if (typeof updates.priority !== "string") {

            return res.status(400).json({
                error: "Priority must be low, medium, or high"
            });

        }

        updates.priority = updates.priority.trim().toLowerCase();

        if (!allowedPriorities.includes(updates.priority)) {

            return res.status(400).json({
                error: "Priority must be low, medium, or high"
            });

        }

    }
    if("status" in updates)
    {
        const allowedStatuses = ["pending", "in progress", "completed"];

        if(typeof updates.status !== "string" || !allowedStatuses.includes(updates.status.trim().toLowerCase()))
        {
            return res.status(400).json({error: "Status must be in [pending, in progress, completed]"});

        }
        updates.status = updates.status.trim().toLowerCase();
    }

    if ("deadline" in updates) {

        if (
            updates.deadline !== null &&
            !isValidDate(updates.deadline)
        ) {

            return res.status(400).json({
                error: "Deadline must be a valid date in YYYY-MM-DD format or null"
            });

        }

    }

    const setClause = fields
        .map((field) => `\`${field}\` = ?`)
        .join(", ");


    // Collect the new values in the same order as the fields.
    const values = fields.map((field) => updates[field]);


    // Add the ID for the WHERE id = ? condition.
    values.push(id);


    try {

        // Update the specified task in MySQL.
        // Use pool.execute(), because pool is imported from db.js.
        const [result] = await pool.execute(
            `UPDATE tasks SET ${setClause} WHERE id = ?`,
            values
        );


        // If MySQL reports that no rows changed, check whether
        // the task exists or its values were already identical.
        if (result.affectedRows === 0) {

            const [existingRows] = await pool.execute(
                "SELECT id FROM tasks WHERE id = ?",
                [id]
            );


            // If no task with this ID exists, return HTTP 404.
            if (existingRows.length === 0) {

                return res.status(404).json({
                    error: "Task not found"
                });

            }

        }


        // Retrieve the task after the update.
        const [rows] = await pool.execute(
            "SELECT * FROM tasks WHERE id = ?",
            [id]
        );


   
        return res.status(200).json({
            message: "Task updated successfully",
            task: rows[0]
        });

    } catch (error) {

        
        console.error("Error updating task:", error.message);


        return res.status(500).json({
            error: "Failed to update task"
        });

    }

});

app.put("/tasks/:id", async (req, res) =>
{
    const id = Number(req.params.id);
    const updates = req.body;

    if(!Number.isInteger(id) || id <= 0)
    {
        return res.status(400).json({error: "id must be positive integer"});
    }
    if(typeof updates.title !== "string" || updates.title.trim() ==="")
    {
        return res.status(400).json({error: "title is required"});

    }
    if(typeof updates.description !== "string" && updates.description !== null)
    {
        return res.status(400).json({error: "description must be a string"});

    }
    if(typeof updates.priority !== "string" || !allowedPriorities.includes(updates.priority.trim().toLowerCase()))
    {
        return res.status(400).json({
            error: "invalid prioirty"
        });
    }
    updates.priority = updates.priority.trim().toLowerCase();

    const allowedstatus = ["pending", "in progress", "completed" ];
    if(typeof updates.status !== "string" || !allowedstatus.includes(updates.status.trim().toLowerCase()))
    {
        return res.status(400).json({error: "invalid status"});
    }
    updates.status = updates.status.trim().toLowerCase();

    if (
    !Object.prototype.hasOwnProperty.call(updates, "deadline") ||
    (updates.deadline !== null && !isValidDate(updates.deadline))) 
    {
        return res.status(400).json({
            error: "Deadline must be a valid date or null"
        });
    }

    const values = [
    updates.title.trim(),
    updates.description,
    updates.priority,
    updates.status,
    updates.deadline,
    id
];
    try{
        const [result] = await pool.execute(`UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, deadline = ? WHERE id = ?`, values);

        if(result.affectedRows === 0)
        {
            const [rows] = await pool.execute("SELECT id from tasks WHERE id = ?", [id]);
            
            if(rows.length === 0)
            {
                return res.status(404).json({error: "task not found"});

            }

        }
        const [rows] = await pool.execute("SELECT * FROM tasks WHERE id = ?", [id]);
        return res.status(200).json({message: "Task replaced successfully!",
            task: rows[0]
        });
    }
    catch(error)
    {
        console.error("Error replacing the task:", error.message);

        return res.status(500).json({error: "Failed to replace task..."});
    }
    


});

app.delete("/tasks/:id", async (req, res) =>
{
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id<=0)
    {
        return res.status(400).json({error: "Enter a valid ID..."});

    }

    try
    {
        const [result] = await pool.execute("DELETE FROM tasks WHERE id  = ?",[id]);

        if(result.affectedRows === 0)
        {
            return res.status(404).json({error: "Task not found..."});
        }

        return res.status(200).json({message: "Task deleted successfully!"})
    }
    catch(error)
    {
        console.error("error deleting the task", error.message);
        return res.status(500).json({error: "Failed to delete task..."});
    }
})


app.listen(PORT, () => {

    // Print the address where the server is running.
    console.log(`Server running at http://localhost:${PORT}`);

});