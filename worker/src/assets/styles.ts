export const baseStyles = `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    text-align: center; 
    padding: 50px; 
    background: #f8f9fa;
    margin: 0;
  }
  
  .container {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .success { 
    color: #28a745; 
    font-size: 24px; 
    margin-bottom: 20px; 
  }
  
  .error { 
    color: #dc3545; 
    font-size: 24px; 
    margin-bottom: 20px; 
  }
  
  .title { 
    color: #2d3748; 
    font-size: 24px; 
    margin-bottom: 20px; 
  }
  
  .message { 
    color: #6c757d; 
    line-height: 1.6; 
  }
  
  .token-section {
    margin: 30px 0;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }
  
  .token-label {
    font-weight: 600;
    margin-bottom: 10px;
    color: #495057;
  }
  
  .token-input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    background: white;
    word-break: break-all;
    box-sizing: border-box;
  }
  
  .copy-btn {
    margin-top: 10px;
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .copy-btn:hover {
    background: #0056b3;
  }
  
  .copy-success {
    color: #28a745;
    font-size: 14px;
    margin-top: 5px;
    display: none;
  }
  
  .auth-btn {
    display: inline-block;
    background: #007bff;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    margin: 20px 0;
    font-weight: 600;
  }
  
  .auth-btn:hover {
    background: #0056b3;
  }
`;
