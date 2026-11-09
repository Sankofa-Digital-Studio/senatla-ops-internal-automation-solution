import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpStatCardComponent } from './erp-stat-card.component';

describe('ErpStatCardComponent', () => {
  let fixture: ComponentFixture<ErpStatCardComponent>;
  let component: ErpStatCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErpStatCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpStatCardComponent);
    component = fixture.componentInstance;
  });

  it('renders title, value, and subtext', () => {
    fixture.componentRef.setInput('title', 'Total Workforce');
    fixture.componentRef.setInput('value', 42);
    fixture.componentRef.setInput('subtext', 'Active personnel');
    fixture.detectChanges();

    const root = fixture.nativeElement;
    expect(root.textContent).toContain('Total Workforce');
    expect(root.textContent).toContain('42');
    expect(root.textContent).toContain('Active personnel');
  });

  it('applies accent tone styling and displays badge', () => {
    fixture.componentRef.setInput('title', 'Compliance Rate');
    fixture.componentRef.setInput('value', '98%');
    fixture.componentRef.setInput('tone', 'accent');
    fixture.componentRef.setInput('badge', '+4%');
    fixture.detectChanges();

    const valueEl = fixture.nativeElement.querySelector('.text-2xl');
    expect(valueEl.className).toContain('text-yellow-400');
    expect(fixture.nativeElement.textContent).toContain('+4%');
  });

  it('supports interactive mode with click and keydown event emissions', () => {
    fixture.componentRef.setInput('title', 'Billed Revenue to Date');
    fixture.componentRef.setInput('value', 'R 8,335,000.00');
    fixture.componentRef.setInput('interactive', true);
    fixture.componentRef.setInput('drilldownHint', 'Trace Milestones →');
    fixture.detectChanges();

    const article = fixture.nativeElement.querySelector('article');
    expect(article.getAttribute('role')).toBe('button');
    expect(article.getAttribute('tabindex')).toBe('0');
    expect(fixture.nativeElement.textContent).toContain('Trace Milestones →');

    let clicked = false;
    component.cardClick.subscribe(() => {
      clicked = true;
    });

    article.click();
    expect(clicked).toBeTrue();

    clicked = false;
    article.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(clicked).toBeTrue();
  });
});
