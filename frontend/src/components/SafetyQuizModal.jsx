import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Award, GraduationCap, X } from "lucide-react";

export function SafetyQuizModal({ isOpen, onClose, course, onPassed }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen || !course) return null;

  const quizQuestions = [
    {
      id: "q1",
      question: "1. Quy định về nhiệt độ môi trường tiêu chuẩn trong phòng Server GPU là bao nhiêu?",
      options: [
        { key: "A", text: "Từ 10°C đến 15°C" },
        { key: "B", text: "Từ 18°C đến 22°C, độ ẩm 45-55%" },
        { key: "C", text: "Từ 25°C đến 30°C" },
        { key: "D", text: "Không có quy định về nhiệt độ" }
      ],
      correct: "B"
    },
    {
      id: "q2",
      question: "2. Trước khi cất cánh thiết bị bay UAV/Drone, dung lượng pin tối thiểu cần đảm bảo là bao nhiêu?",
      options: [
        { key: "A", text: "Tối thiểu 50%" },
        { key: "B", text: "Tối thiểu 70%" },
        { key: "C", text: "Tối thiểu 90%" },
        { key: "D", text: "Tối thiểu 30%" }
      ],
      correct: "C"
    },
    {
      id: "q3",
      question: "3. Độ cao bay tối đa cho phép đối với UAV/Drone trong khuôn viên phòng lab/trường học là?",
      options: [
        { key: "A", text: "120 mét so với mặt đất (AGL)" },
        { key: "B", text: "300 mét so với mặt đất" },
        { key: "C", text: "500 mét" },
        { key: "D", text: "Bay tự do không hạn chế" }
      ],
      correct: "A"
    },
    {
      id: "q4",
      question: "4. Bạn được phép chạy ứng dụng trực tiếp trên Host System của Server GPU hay không?",
      options: [
        { key: "A", text: "Có, chạy thoải mái" },
        { key: "B", text: "Không, bắt buộc phải chạy qua Docker / Containerization" },
        { key: "C", text: "Tùy thuộc vào người quản lý" }
      ],
      correct: "B"
    }
  ];

  function handleSelectOption(qId, key) {
    setAnswers({ ...answers, [qId]: key });
  }

  function handleSubmitQuiz(e) {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      let correctCount = 0;
      quizQuestions.forEach((q) => {
        if (answers[q.id] === q.correct) correctCount += 1;
      });

      const score = Math.round((correctCount / quizQuestions.length) * 100);
      const passed = score >= 80;

      setResult({ score, correctCount, total: quizQuestions.length, passed });
      setSubmitting(false);

      if (passed && onPassed) {
        onPassed({ courseId: course.id, score, answers });
      }
    }, 800);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card quiz-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <GraduationCap className="text-primary" size={22} />
            <h3>Bài Thi Trắc Nghiệm An Toàn — {course.name}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body quiz-body">
          {result ? (
            <div className={`quiz-result-card ${result.passed ? "passed" : "failed"}`}>
              {result.passed ? (
                <>
                  <Award size={64} className="text-success animated-bounce" />
                  <h2>CHÚC MỪNG! BẠN ĐÃ ĐẠT BÀI THI</h2>
                  <p className="score-text">Kết quả: <strong>{result.score}/100 điểm</strong> ({result.correctCount}/{result.total} câu đúng)</p>
                  <div className="alert success">
                    🎉 Chứng chỉ <strong>{course.name}</strong> đã được tự động cấp và cập nhật vào hồ sơ của bạn! Bạn có thể đặt thiết bị ngay lập tức.
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={64} className="text-danger" />
                  <h2>BÀI THI CHƯA ĐẠT (YÊU CẦU ≥ 75 DỊỂM)</h2>
                  <p className="score-text">Kết quả: <strong>{result.score}/100 điểm</strong> ({result.correctCount}/{result.total} câu đúng)</p>
                  <button className="btn btn-primary" onClick={() => setResult(null)}>Thử Làm Lại Bài Thi</button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitQuiz}>
              <p className="quiz-intro">Trả lời đúng tối thiểu 3/4 câu hỏi dưới đây để hoàn thành chứng chỉ an toàn phòng lab.</p>
              
              <div className="questions-list">
                {quizQuestions.map((q) => (
                  <div key={q.id} className="quiz-question-box">
                    <h4 className="question-title">{q.question}</h4>
                    <div className="options-grid">
                      {q.options.map((opt) => (
                        <label
                          key={opt.key}
                          className={`option-card ${answers[q.id] === opt.key ? "selected" : ""}`}
                          onClick={() => handleSelectOption(q.id, opt.key)}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt.key}
                            checked={answers[q.id] === opt.key}
                            onChange={() => {}}
                          />
                          <span className="opt-key">{opt.key}.</span>
                          <span className="opt-text">{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || Object.keys(answers).length < quizQuestions.length}
                >
                  {submitting ? "Đang chấm điểm..." : "Nộp Bài Thi"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
