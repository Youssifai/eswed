"use client";

import React, { useState } from "react";
import { Calendar, X } from "lucide-react";
import { setProjectDeadline } from "@/actions/deadline-actions";

interface DatePickerProps {
  projectId: string;
  currentDeadline: Date | null;
}

export default function DatePicker({ projectId, currentDeadline }: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    currentDeadline ? new Date(currentDeadline).toISOString().split('T')[0] : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDateChange = async () => {
    setIsSubmitting(true);
    try {
      await setProjectDeadline(projectId, selectedDate || null);
      setShowPicker(false);
    } catch (error) {
      console.error("Failed to update deadline:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDeadline = async () => {
    setIsSubmitting(true);
    try {
      await setProjectDeadline(projectId, null);
      setSelectedDate("");
      setShowPicker(false);
    } catch (error) {
      console.error("Failed to remove deadline:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="text-sm bg-[#1E1E1E] px-4 py-2 rounded-md hover:bg-[#2A2A2A] transition-colors flex items-center"
      >
        Set deadline
        <Calendar className="inline-block ml-2 w-4 h-4" />
      </button>

      {showPicker && (
        <div className="absolute z-10 right-0 top-full mt-2 bg-[#1E1E1E] border border-[#4A4A4A] rounded-md p-4 shadow-lg w-72">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Set Project Deadline</h3>
            <button 
              onClick={() => setShowPicker(false)}
              className="text-white/50 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#292929] text-white p-2 rounded mb-3 w-full border border-[#4A4A4A]"
          />
          
          <div className="flex justify-between">
            <button
              onClick={handleRemoveDeadline}
              disabled={isSubmitting || !currentDeadline}
              className="text-sm bg-[#292929] px-3 py-1.5 rounded-md hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
            
            <button
              onClick={handleDateChange}
              disabled={isSubmitting || !selectedDate}
              className="text-sm bg-[#292929] px-3 py-1.5 rounded-md hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 