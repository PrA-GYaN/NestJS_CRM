import { BadRequestException } from '@nestjs/common';
import { QueueStateMachine } from './queue-state-machine';
import { QueueItemStatusEnum } from './dto/queue.dto';

describe('QueueStateMachine', () => {
  describe('isValidTransition', () => {
    it('should allow Waiting -> Assigned', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Waiting,
        QueueItemStatusEnum.Assigned,
      )).toBe(true);
    });

    it('should not allow Waiting -> InProgress', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Waiting,
        QueueItemStatusEnum.InProgress,
      )).toBe(false);
    });

    it('should not allow Waiting -> Completed', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Waiting,
        QueueItemStatusEnum.Completed,
      )).toBe(false);
    });

    it('should not allow Waiting -> Skipped', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Waiting,
        QueueItemStatusEnum.Skipped,
      )).toBe(false);
    });

    it('should allow Assigned -> InProgress', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Assigned,
        QueueItemStatusEnum.InProgress,
      )).toBe(true);
    });

    it('should allow Assigned -> Skipped', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Assigned,
        QueueItemStatusEnum.Skipped,
      )).toBe(true);
    });

    it('should not allow Assigned -> Completed', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Assigned,
        QueueItemStatusEnum.Completed,
      )).toBe(false);
    });

    it('should not allow Assigned -> Waiting', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Assigned,
        QueueItemStatusEnum.Waiting,
      )).toBe(false);
    });

    it('should allow InProgress -> Completed', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.InProgress,
        QueueItemStatusEnum.Completed,
      )).toBe(true);
    });

    it('should allow InProgress -> Skipped', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.InProgress,
        QueueItemStatusEnum.Skipped,
      )).toBe(true);
    });

    it('should not allow InProgress -> Assigned', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.InProgress,
        QueueItemStatusEnum.Assigned,
      )).toBe(false);
    });

    it('should not allow transitions from Completed', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Completed,
        QueueItemStatusEnum.InProgress,
      )).toBe(false);
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Completed,
        QueueItemStatusEnum.Assigned,
      )).toBe(false);
    });

    it('should not allow transitions from Skipped', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Skipped,
        QueueItemStatusEnum.InProgress,
      )).toBe(false);
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Skipped,
        QueueItemStatusEnum.Assigned,
      )).toBe(false);
    });

    it('should treat same-status transition as valid', () => {
      expect(QueueStateMachine.isValidTransition(
        QueueItemStatusEnum.Waiting,
        QueueItemStatusEnum.Waiting,
      )).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transition', () => {
      expect(() => {
        QueueStateMachine.validateTransition(
          QueueItemStatusEnum.Waiting,
          QueueItemStatusEnum.Assigned,
        );
      }).not.toThrow();
    });

    it('should throw BadRequestException for invalid transition', () => {
      expect(() => {
        QueueStateMachine.validateTransition(
          QueueItemStatusEnum.Waiting,
          QueueItemStatusEnum.Completed,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw with descriptive message', () => {
      expect(() => {
        QueueStateMachine.validateTransition(
          QueueItemStatusEnum.Waiting,
          QueueItemStatusEnum.Skipped,
        );
      }).toThrow(/Invalid queue item status transition/);
    });

    it('should allow same-status for self-transition', () => {
      expect(() => {
        QueueStateMachine.validateTransition(
          QueueItemStatusEnum.Assigned,
          QueueItemStatusEnum.Assigned,
        );
      }).not.toThrow();
    });
  });

  describe('getValidTransitions', () => {
    it('should return all valid transitions', () => {
      const transitions = QueueStateMachine.getValidTransitions();
      expect(transitions).toBeDefined();
      expect(transitions[QueueItemStatusEnum.Waiting]).toContain(QueueItemStatusEnum.Assigned);
      expect(transitions[QueueItemStatusEnum.Assigned]).toContain(QueueItemStatusEnum.InProgress);
      expect(transitions[QueueItemStatusEnum.Assigned]).toContain(QueueItemStatusEnum.Skipped);
      expect(transitions[QueueItemStatusEnum.InProgress]).toContain(QueueItemStatusEnum.Completed);
      expect(transitions[QueueItemStatusEnum.InProgress]).toContain(QueueItemStatusEnum.Skipped);
      expect(transitions[QueueItemStatusEnum.Completed]).toEqual([]);
      expect(transitions[QueueItemStatusEnum.Skipped]).toEqual([]);
    });
  });
});
