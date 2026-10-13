import { describe, it, expect } from 'vitest';
import {
  DIRECTORY_PAGE_SIZE,
  categorySectionId,
  directoryPageHref,
  directoryPageWindow,
  normalizeCategory,
  selectDirectoryPage,
} from './directory-pagination';

describe('Public directory pagination contract', () => {
  it('keeps a bounded page size so the initial payload cannot grow with the catalogue', () => {
    expect(DIRECTORY_PAGE_SIZE).toBeLessThanOrEqual(100);
    expect(DIRECTORY_PAGE_SIZE).toBeGreaterThan(0);
  });

  describe('page query parameter', () => {
    it('treats a missing or empty parameter as page 1 without an explicit page identity', () => {
      expect(selectDirectoryPage(undefined)).toEqual({ page: 1, explicit: false });
      expect(selectDirectoryPage('')).toEqual({ page: 1, explicit: false });
      expect(selectDirectoryPage('   ')).toEqual({ page: 1, explicit: false });
    });

    it('accepts explicit positive integers, including repeated parameters', () => {
      expect(selectDirectoryPage('1')).toEqual({ page: 1, explicit: true });
      expect(selectDirectoryPage('2')).toEqual({ page: 2, explicit: true });
      expect(selectDirectoryPage('010')).toEqual({ page: 10, explicit: true });
      expect(selectDirectoryPage(['3', '4'])).toEqual({ page: 3, explicit: true });
    });

    it('rejects values that cannot identify a real page so the route can answer 404', () => {
      expect(selectDirectoryPage('0')).toBeNull();
      expect(selectDirectoryPage('-3')).toBeNull();
      expect(selectDirectoryPage('1.5')).toBeNull();
      expect(selectDirectoryPage('abc')).toBeNull();
      expect(selectDirectoryPage('2p')).toBeNull();
      expect(selectDirectoryPage('99999999999999999999')).toBeNull();
    });
  });

  describe('canonical page URL', () => {
    it('keeps page 1 on the bare directory path', () => {
      expect(directoryPageHref(1)).toBe('/directorio');
    });

    it('gives every later page its own parameterised URL', () => {
      expect(directoryPageHref(2)).toBe('/directorio?page=2');
      expect(directoryPageHref(19)).toBe('/directorio?page=19');
    });
  });

  describe('page number window', () => {
    it('shows the first and last page plus neighbours of the current page', () => {
      expect(directoryPageWindow(1, 19)).toEqual([1, 2, 3, null, 19]);
      expect(directoryPageWindow(10, 19)).toEqual([1, null, 8, 9, 10, 11, 12, null, 19]);
      expect(directoryPageWindow(19, 19)).toEqual([1, null, 17, 18, 19]);
    });

    it('collapses to a single page when the catalogue fits one page', () => {
      expect(directoryPageWindow(1, 1)).toEqual([1]);
      expect(directoryPageWindow(1, 2)).toEqual([1, 2]);
    });

    it('never emits page numbers outside the catalogue', () => {
      const window = directoryPageWindow(1, 5).filter((value): value is number => value !== null);
      expect(window.every((page) => page >= 1 && page <= 5)).toBe(true);
    });
  });

  describe('category identity', () => {
    it('falls back to General for missing or blank categories', () => {
      expect(normalizeCategory(null)).toBe('General');
      expect(normalizeCategory(undefined)).toBe('General');
      expect(normalizeCategory('   ')).toBe('General');
    });

    it('trims category names for display and ordering', () => {
      expect(normalizeCategory('  Moda, Calzado y Accesorios  ')).toBe('Moda, Calzado y Accesorios');
    });

    it('keeps anchor ids stable and URL-safe', () => {
      expect(categorySectionId('Moda, Calzado y Accesorios')).toBe('cat-moda%2C-calzado-y-accesorios');
      expect(categorySectionId('Comercio Electrónico Especializado')).toBe(
        'cat-comercio-electr%C3%B3nico-especializado'
      );
    });
  });
});
