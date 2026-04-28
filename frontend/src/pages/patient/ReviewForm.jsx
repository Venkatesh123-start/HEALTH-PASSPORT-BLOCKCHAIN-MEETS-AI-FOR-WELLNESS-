import React, { useState } from "react";

const ReviewForm = ({ doctorId, patientId, token, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch(`http://localhost:5000/api/reviews/doctor/${doctorId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ patientId, rating, comment }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Review submitted!");
        setRating(5);
        setComment("");
        if (onReviewSubmitted) onReviewSubmitted();
      } else {
        setMessage(data.message || "Failed to submit review.");
      }
    } catch (err) {
      setMessage("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <label>Rating:</label>
      <select value={rating} onChange={e => setRating(Number(e.target.value))} required>
        {[5,4,3,2,1].map(val => (
          <option key={val} value={val}>{val}</option>
        ))}
      </select>
      <label>Comment:</label>
      <textarea value={comment} onChange={e => setComment(e.target.value)} />
      <button type="submit" disabled={submitting}>Submit Review</button>
      {message && <div className="review-message">{message}</div>}
    </form>
  );
};

export default ReviewForm;
