import { BadRequestException } from '@nestjs/common';
import { QueueItemStatusEnum } from './dto/queue.dto';

const VALID_TRANSITIONS: Record<QueueItemStatusEnum, QueueItemStatusEnum[]> = {
  [QueueItemStatusEnum.Waiting]: [QueueItemStatusEnum.Assigned],
  [QueueItemStatusEnum.Assigned]: [QueueItemStatusEnum.InProgress, QueueItemStatusEnum.Skipped],
  [QueueItemStatusEnum.InProgress]: [QueueItemStatusEnum.Completed, QueueItemStatusEnum.Skipped],
  [QueueItemStatusEnum.Completed]: [],
  [QueueItemStatusEnum.Skipped]: [],
  [QueueItemStatusEnum.Reassigned]: [],
};

export class QueueStateMachine {
  static isValidTransition(
    from: QueueItemStatusEnum,
    to: QueueItemStatusEnum,
  ): boolean {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  static validateTransition(
    from: QueueItemStatusEnum,
    to: QueueItemStatusEnum,
  ): void {
    if (from === to) return;

    if (!QueueStateMachine.isValidTransition(from, to)) {
      throw new BadRequestException(
        `Invalid queue item status transition: ${from} -> ${to}. ` +
        `Allowed transitions from ${from}: ${(VALID_TRANSITIONS[from] || []).join(', ') || 'none'}`,
      );
    }
  }

  static getValidTransitions(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [from, toList] of Object.entries(VALID_TRANSITIONS)) {
      result[from] = toList;
    }
    return result;
  }
}
