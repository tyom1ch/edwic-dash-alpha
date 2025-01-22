import React, { useState, useEffect } from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from "@mui/material";

function ComponentDialog({ isOpen, onClose, onSave, component, isEdit }) {
  const [localComponent, setLocalComponent] = useState(component || {});

  useEffect(() => {
    if (isEdit && component) {
      setLocalComponent(component);  // Populate the dialog with the current component
    }
  }, [isEdit, component]);

  const handleSave = () => {
    if (onSave && localComponent) {
      onSave(localComponent);  // This will call the `handleSaveComponent` function in MainDashboard
      onClose();  // Close the modal after saving
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalComponent((prev) => ({
      ...prev,
      [name]: value,  // Update the title here
    }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{isEdit ? "Edit Component" : "Add Component"}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Component Title"
          type="text"
          fullWidth
          name="title"  // Make sure this is linked to the component's title
          value={localComponent.title || ""}
          onChange={handleChange}  // Update the title in the state when changed
        />
        {/* You can add more fields if needed */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ComponentDialog;
