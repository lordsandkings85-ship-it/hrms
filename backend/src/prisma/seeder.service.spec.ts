import { SeederService } from './seeder.service';

const prisma = {} as any;

describe('SeederService.autoPopulate', () => {
  const original = process.env.AUTO_SEED;

  afterEach(() => {
    if (original === undefined) delete process.env.AUTO_SEED;
    else process.env.AUTO_SEED = original;
  });

  it('does nothing when AUTO_SEED is not set', async () => {
    delete process.env.AUTO_SEED;
    const seeder = new SeederService(prisma);
    await expect(seeder.autoPopulate('company-A', 'emp-1')).resolves.toBeUndefined();
  });

  it('does nothing when AUTO_SEED is disabled', async () => {
    process.env.AUTO_SEED = 'false';
    const seeder = new SeederService(prisma);
    await expect(seeder.autoPopulate('company-A', 'emp-1')).resolves.toBeUndefined();
  });

  it('proceeds to seed when AUTO_SEED is enabled', async () => {
    process.env.AUTO_SEED = 'true';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const calls: string[] = [];
    const fakePrisma = {
      branch: { create: jest.fn(async () => { calls.push('branch'); return { id: 'b1' }; }) },
    } as any;
    const seeder = new SeederService(fakePrisma);
    // Will throw on the first missing model, but must have reached the body (created a branch first)
    await seeder.autoPopulate('company-A', 'emp-1').catch(() => {});
    expect(calls).toContain('branch');
    errorSpy.mockRestore();
  });
});
