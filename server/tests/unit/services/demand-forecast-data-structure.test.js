const DemandForecastService = require('../../../src/services/demand-forecast-service');

describe('DemandForecastService - Data Structure TDD Tests', () => {
  let service;

  beforeEach(() => {
    service = new DemandForecastService();
  });

  describe('_transformPredictions', () => {
    describe('RED: Field name transformations', () => {
      it('should transform predicted_orders to orders', () => {
        const predictions = [{
          date: '2025-05-25',
          predicted_orders: 250,
          predicted_revenue: 14455,
          confidence: 0.85
        }];

        const result = service._transformPredictions(predictions);
        
        expect(result[0].orders).toBe(250);
        expect(result[0].predicted_orders).toBeUndefined();
      });

      it('should transform predicted_revenue to revenue', () => {
        const predictions = [{
          date: '2025-05-25',
          predicted_orders: 250,
          predicted_revenue: 14455,
          confidence: 0.85
        }];

        const result = service._transformPredictions(predictions);
        
        expect(result[0].revenue).toBe(14455);
        expect(result[0].predicted_revenue).toBeUndefined();
      });

      it('should calculate day_of_week when missing', () => {
        const predictions = [{
          date: '2025-05-25', // This is a Sunday
          predicted_orders: 250,
          predicted_revenue: 14455,
          confidence: 0.85
        }];

        const result = service._transformPredictions(predictions);
        
        expect(result[0].day_of_week).toBe('Sunday');
      });

      it('should preserve existing day_of_week when present', () => {
        const predictions = [{
          date: '2025-05-25',
          day_of_week: 'Custom Day',
          predicted_orders: 250,
          predicted_revenue: 14455,
          confidence: 0.85
        }];

        const result = service._transformPredictions(predictions);
        
        expect(result[0].day_of_week).toBe('Custom Day');
      });
    });

    describe('GREEN: Frontend compatibility', () => {
      it('should ensure all required frontend fields are present', () => {
        const predictions = [{
          date: '2025-05-25',
          predicted_orders: 250,
          predicted_revenue: 14455,
          confidence: 0.85
        }];

        const result = service._transformPredictions(predictions);
        const prediction = result[0];
        
        // All required fields for ForecastViewer.js table
        expect(prediction).toHaveProperty('date');
        expect(prediction).toHaveProperty('day_of_week');
        expect(prediction).toHaveProperty('orders');
        expect(prediction).toHaveProperty('revenue');
        expect(prediction).toHaveProperty('confidence');
        
        // Ensure values are correct types
        expect(typeof prediction.orders).toBe('number');
        expect(typeof prediction.revenue).toBe('number');
        expect(typeof prediction.confidence).toBe('number');
        expect(typeof prediction.day_of_week).toBe('string');
      });

      it('should handle both old and new field names gracefully', () => {
        const mixedPredictions = [
          // Old format
          {
            date: '2025-05-25',
            predicted_orders: 250,
            predicted_revenue: 14455,
            confidence: 0.85
          },
          // New format
          {
            date: '2025-05-26',
            day_of_week: 'Monday',
            orders: 200,
            revenue: 12000,
            confidence: 0.8
          }
        ];

        const result = service._transformPredictions(mixedPredictions);
        
        // Both should have consistent structure
        expect(result[0]).toMatchObject({
          date: '2025-05-25',
          day_of_week: 'Sunday',
          orders: 250,
          revenue: 14455,
          confidence: 0.85
        });
        
        expect(result[1]).toMatchObject({
          date: '2025-05-26',
          day_of_week: 'Monday',
          orders: 200,
          revenue: 12000,
          confidence: 0.8
        });
      });
    });

    describe('REFACTOR: Edge cases and error handling', () => {
      it('should handle empty array', () => {
        const result = service._transformPredictions([]);
        expect(result).toEqual([]);
      });

      it('should handle null/undefined input', () => {
        expect(service._transformPredictions(null)).toEqual([]);
        expect(service._transformPredictions(undefined)).toEqual([]);
        expect(service._transformPredictions('not-array')).toEqual([]);
      });

      it('should provide default values for missing fields', () => {
        const predictions = [{ date: '2025-05-25' }];

        const result = service._transformPredictions(predictions);
        
        expect(result[0]).toMatchObject({
          date: '2025-05-25',
          day_of_week: 'Sunday',
          orders: 0,
          revenue: 0,
          confidence: 0,
          peak_hours: [],
          notes: ''
        });
      });

      it('should handle invalid dates gracefully', () => {
        const predictions = [{ date: 'invalid-date' }];

        const result = service._transformPredictions(predictions);
        
        expect(result[0].day_of_week).toBe('N/A');
      });
    });
  });

  describe('_enhanceAIResponse', () => {
    describe('Integration with prediction transformation', () => {
      it('should transform forecast predictions in AI response', () => {
        const aiResponse = {
          data: {
            confidence: 0.85,
            forecast: [
              {
                date: '2025-05-25',
                predicted_orders: 250,
                predicted_revenue: 14455,
                confidence: 0.85
              }
            ],
            insights: ['Test insight'],
            recommendations: ['Test recommendation'],
            summary: {
              total_predicted_orders: 250,
              total_predicted_revenue: 14455
            }
          }
        };

        const result = service._enhanceAIResponse(aiResponse, {});
        
        expect(result.forecast[0]).toMatchObject({
          date: '2025-05-25',
          day_of_week: 'Sunday',
          orders: 250,
          revenue: 14455,
          confidence: 0.85
        });
      });

      it('should ensure summary has consistent field names', () => {
        const aiResponse = {
          data: {
            summary: {
              total_predicted_orders: 1000,
              total_predicted_revenue: 50000,
              average_confidence: 0.8
            }
          }
        };

        const result = service._enhanceAIResponse(aiResponse, {});
        
        expect(result.summary).toMatchObject({
          total_predicted_orders: 1000,
          total_predicted_revenue: 50000,
          average_confidence: 0.8,
          peak_day: 'N/A',
          growth_trend: 'stable'
        });
      });
    });
  });

  describe('Frontend Integration Contract Tests', () => {
    it('should match ForecastViewer.js expectations exactly', () => {
      // This test defines the exact contract between backend and frontend
      const mockAIResponse = {
        data: {
          confidence: 0.85,
          forecast: [
            {
              date: '2025-05-25',
              predicted_orders: 250,
              predicted_revenue: 14455,
              confidence: 0.85,
              peak_hours: ['11:00', '18:00'],
              notes: 'Test note'
            }
          ],
          insights: ['Test insight'],
          recommendations: ['Test recommendation'],
          summary: {
            total_predicted_orders: 250,
            total_predicted_revenue: 14455,
            average_confidence: 0.85,
            growth_trend: 'increasing'
          }
        }
      };

      const result = service._enhanceAIResponse(mockAIResponse, {});
      
      // Verify structure matches what ForecastViewer expects
      expect(result).toHaveProperty('forecast');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('summary');
      
      // Verify prediction structure
      const prediction = result.forecast[0];
      expect(prediction.date).toBe('2025-05-25');
      expect(prediction.day_of_week).toBe('Sunday');
      expect(prediction.orders).toBe(250);
      expect(prediction.revenue).toBe(14455);
      expect(prediction.confidence).toBe(0.85);
      
      // Verify summary structure
      expect(result.summary.total_predicted_orders).toBe(250);
      expect(result.summary.total_predicted_revenue).toBe(14455);
      expect(result.summary.average_confidence).toBe(0.85);
    });
  });
});