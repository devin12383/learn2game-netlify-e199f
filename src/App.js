import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify'; // Import the Amplify library
import { post } from 'aws-amplify/api'; // Import the POST method from Amplify API
import config from './aws-exports'; // Import the Amplify configuration file

// Configure Amplify with the settings from your project
Amplify.configure(config);

function App() {
  const [lessonText, setLessonText] = useState('');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateGames = async () => {
    if (!lessonText.trim()) {
      setError('Please paste or type some lesson content.');
      return;
    }

    setLoading(true);
    setGameData(null);
    setError('');

    try {
      // --- This calls your secure serverless function via Amplify's API. ---
      // The path is now '/items' which exists in your API Gateway.
      // We are sending the lesson text in the request body.
      const restOperation = post({
          apiName: 'learn2gameapi', // This is the name of the API created by Amplify.
          path: '/items', //  <-- THIS PATH IS CORRECTLY SET TO '/items'
          options: {
            body: {
                lessonText: lessonText 
            }
          }
      });
      
      const { body } = await restOperation.response;
      const jsonResponse = await body.json(); // Get the JSON response from the serverless function.
      
      setGameData(jsonResponse);

    } catch (err) {
      console.error("Error generating games:", err);
      // More user-friendly error messages based on common API errors
      let displayError = "Failed to generate games. Please try again. Make sure your serverless function is deployed correctly.";
      if (err.message) {
        displayError += " Error: " + err.message;
      }
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  // --- Game Components (No changes needed here) ---

  const MultipleChoiceGame = ({ game }) => {
    const [selectedAnswers, setSelectedAnswers] = useState({}); // { qIndex: selectedOption }
    const [showResults, setShowResults] = useState({}); // { qIndex: boolean }
    const [score, setScore] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    const handleOptionChange = (qIndex, option) => {
      setSelectedAnswers(prev => ({ ...prev, [qIndex]: option }));
      setShowResults(prev => ({ ...prev, [qIndex]: false })); // Hide feedback if option changes
    };

    const handleSubmitAnswer = (qIndex, correctAnswer) => {
      setShowResults(prev => ({ ...prev, [qIndex]: true }));
      // Only update score if not already counted for this question
      if (selectedAnswers[qIndex] === correctAnswer && !submitted) {
        setScore(prev => prev + 1);
      }
      setSubmitted(true); // Mark as submitted to prevent re-scoring same question
    };

    const isCorrect = (qIndex, option) => selectedAnswers[qIndex] === game.questions[qIndex].correctAnswer;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">{game.title}</h3>
        <p className="text-gray-600 mb-4">{game.description}</p>
        <div className="text-xl font-semibold mb-4">Score: {score}/{game.questions.length}</div>

        {game.questions.map((q, qIndex) => (
          <div key={qIndex} className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="font-semibold text-lg mb-3">{qIndex + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((option, oIndex) => (
                <label key={oIndex} className="block cursor-pointer flex items-center">
                  <input
                    type="radio"
                    name={`question-${qIndex}`}
                    value={option}
                    checked={selectedAnswers[qIndex] === option}
                    onChange={() => handleOptionChange(qIndex, option)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    disabled={showResults[qIndex]} // Disable after submission
                  />
                  <span className={`text-base ${showResults[qIndex] && selectedAnswers[qIndex] === option && !isCorrect(qIndex, option) ? 'line-through text-red-500' : ''}`}>
                    {option}
                  </span>
                  {showResults[qIndex] && q.correctAnswer === option && (
                    <span className="ml-2 text-green-600 font-bold">&#10003; Correct</span>
                  )}
                </label>
              ))}
            </div>

            {!showResults[qIndex] && (
              <button
                onClick={() => handleSubmitAnswer(qIndex, q.correctAnswer)}
                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
                disabled={!selectedAnswers[qIndex]} // Disable if no option selected
              >
                Check Answer
              </button>
            )}

            {showResults[qIndex] && (
              <div className={`mt-4 p-3 rounded-md ${isCorrect(qIndex, q.correctAnswer) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isCorrect(qIndex, q.correctAnswer) ? (
                  <p className="font-bold">Correct!</p>
                ) : (
                  <p className="font-bold">Incorrect. The correct answer was: <span className="text-green-700">{q.correctAnswer}</span></p>
                )}
                <p className="mt-1 text-sm">Explanation: {q.explanation}</p>
                {q.hint && <p className="mt-1 text-sm italic">Hint: {q.hint}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const FillInTheBlanksGame = ({ game }) => {
    const [userAnswers, setUserAnswers] = useState({}); // { blankIndex: userAnswer }
    const [showResults, setShowResults] = useState({}); // { blankIndex: boolean }
    const [score, setScore] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    const handleInputChange = (blankIndex, value) => {
      setUserAnswers(prev => ({ ...prev, [blankIndex]: value }));
      setShowResults(prev => ({ ...prev, [blankIndex]: false }));
    };

    const handleSubmitAnswer = (blankIndex, correctAnswer) => {
      setShowResults(prev => ({ ...prev, [blankIndex]: true }));
      // Simple case-insensitive comparison
      if (userAnswers[blankIndex]?.toLowerCase() === correctAnswer.toLowerCase() && !submitted) {
        setScore(prev => prev + 1);
      }
      setSubmitted(true);
    };

    const isCorrect = (blankIndex, correctAnswer) =>
      userAnswers[blankIndex]?.toLowerCase() === correctAnswer.toLowerCase();

    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">{game.title}</h3>
        <p className="text-gray-600 mb-4">{game.description}</p>
        <div className="text-xl font-semibold mb-4">Score: {score}/{game.blanks.length}</div>

        {game.blanks.map((b, bIndex) => (
          <div key={bIndex} className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="font-semibold text-lg mb-3">
              {bIndex + 1}. {b.sentence.split('_').map((part, i) => (
                <React.Fragment key={i}>
                  {part}
                  {i < b.sentence.split('_').length - 1 && (
                    <input
                      type="text"
                      className="border border-gray-300 p-2 rounded-md mx-2 w-48 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Answer"
                      value={userAnswers[bIndex] || ''}
                      onChange={(e) => handleInputChange(bIndex, e.target.value)}
                      disabled={showResults[bIndex]} // Disable after submission
                    />
                  )}
                </React.Fragment>
              ))}
            </p>

            {!showResults[bIndex] && (
              <button
                onClick={() => handleSubmitAnswer(bIndex, b.answer)}
                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
                disabled={!userAnswers[bIndex]?.trim()} // Disable if input is empty
              >
                Check Answer
              </button>
            )}

            {showResults[bIndex] && (
              <div className={`mt-4 p-3 rounded-md ${isCorrect(bIndex, b.answer) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isCorrect(bIndex, b.answer) ? (
                  <p className="font-bold">Correct!</p>
                ) : (
                  <p className="font-bold">Incorrect. The correct answer was: <span className="text-green-700">{b.answer}</span></p>
                )}
                <p className="mt-1 text-sm">Explanation: {q.explanation}</p>
                {q.hint && <p className="mt-1 text-sm italic">Hint: {q.hint}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // --- Main App Render ---
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center text-gray-900 mb-8">
          Interactive Lesson Games
        </h1>

        <div className="bg-white p-8 rounded-lg shadow-xl mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">
            1. Provide Your Lesson Content
          </h2>
          <p className="text-gray-600 mb-4">
            Paste your text, a chapter from a book, or content copied directly from a PDF.
            The AI will analyze it and create games.
          </p>
          <textarea
            className="w-full p-4 border border-gray-300 rounded-lg text-lg resize-y focus:ring-blue-500 focus:border-blue-500"
            rows="12"
            // The placeholder text is now guaranteed to be correct here
            placeholder="E.g., A paragraph about photosynthesis, a history lesson, a science concept..." 
            value={lessonText}
            onChange={(e) => setLessonText(e.target.value)}
          ></textarea>
          <button
            onClick={generateGames}
            className="mt-6 w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-xl font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Games...
              </span>
            ) : (
              'Generate Interactive Games'
            )}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        {gameData && (
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6">
              2. Your Interactive Games!
            </h2>
            <div className="text-gray-700 mb-8 border-b pb-4">
              <p className="text-lg font-bold mb-1">Lesson Summary:</p>
              <p className="mb-3">{gameData.lessonSummary}</p>
              <p className="text-lg font-bold mb-1">Complexity:</p>
              <p className="mb-3">{gameData.complexity}</p>
              <p className="text-lg font-bold mb-1">Suggested Age Range:</p>
              <p className="mb-3">{gameData.ageRange}</p>
            </div>

            <div className="space-y-8">
              {gameData.games.map((game, index) => {
                if (game.type === 'multipleChoice') {
                  return <MultipleChoiceGame key={index} game={game} />;
                } else if (game.type === 'fillInTheBlanks') {
                  return <FillInTheBlanksGame key={index} game={game} />;
                }
                return null; // For other game types you might add later
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;